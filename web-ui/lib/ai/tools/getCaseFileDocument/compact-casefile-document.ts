/**
 * @module compact-casefile-document
 * @fileoverview
 * Utilities for compacting, deduplicating, and normalizing deeply nested case file document structures.
 *
 * - Removes null/undefined fields recursively for serialization and storage efficiency.
 * - Deduplicates and merges related document references (target/source) into flat maps.
 * - Prevents self-referencing and content duplication in nested document/attachment trees.
 * - Handles CTA (call-to-action) and response normalization for downstream AI and UI consumers.
 *
 * Exported:
 * - compactCaseFileDocument: Main entry point for compacting a full document.
 *
 * Internal helpers:
 * - compactNulls: Recursively removes null/undefined fields from objects/arrays.
 * - mergeToMap/mergeToMaps: Deduplicate and merge related document references.
 * - compactDocProp, compactCta, compactCtaResponse: Normalize and compact document property/CTA trees.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { KeyOf } from '@/lib/typescript/_types';
import { DocumentSchemaType, RelatedDocumentSchemaType, SourceDocumentSchemaType, TargetDocumentSchemaType } from '../schemas';
import { BaseDocumentPropertySchemaType, CtaResponseSchemaType, CtaSchemaType, DocumentPropertySchemaType } from '../schemas/documentPropertyShape';

/**
 * Overload signature for mergeToMap, supporting both Target and Source document types.
 */
interface MergeToMapOverloads {
  (props:{map: Map<number, TargetDocumentSchemaType>; doc: TargetDocumentSchemaType; referencedItem: string; }): void;
  (props:{map: Map<number, SourceDocumentSchemaType>; doc: SourceDocumentSchemaType; referencedItem: string; }): void;
}

/**
 * Recursively removes all null and undefined fields from an object (and optionally its nested children).
 *
 * @template TModel - The object type to compact.
 * @param target - The object to compact.
 * @param recurse - If true, recursively compact nested objects/arrays.
 * @returns The compacted object with all null/undefined fields removed.
 */
const compactNulls = <TModel extends object>(target: TModel, recurse: boolean = false):TModel => {  
  Object.keys(target).forEach((key: unknown) => {    
    const k = key as KeyOf<TModel>;
    const check = target[k]
    if (check === undefined || check === null) {
      delete target[k];
    } else if (recurse && typeof check === 'object') {
      if (Array.isArray(check)){
        check.forEach((item) => compactNulls(item, true));
      } else {
        compactNulls(check as object, true);
      }
    }
  });  
  return target;
}

/**
 * Extracts a unique numeric id from a RelatedDocument, supporting multiple possible id fields.
 * Throws if no id can be found.
 *
 * @param doc - The related document object.
 * @returns The numeric id for the related document.
 * @throws {TypeError} If no id can be found.
 */
const getRelatedDocumentId = (doc: RelatedDocumentSchemaType): number => {
  let checkId = 'targetDocumentId' in doc ? Number(doc.targetDocumentId) : undefined;
  if (checkId && !isNaN(checkId)) { return checkId; };
  checkId = 'sourceDocumentId' in doc ? Number(doc.sourceDocumentId) : undefined;
  if (checkId && !isNaN(checkId)) { return checkId; };
  checkId = 'targetDoc' in doc && doc.targetDoc && 'unitId' in doc.targetDoc ? doc.targetDoc.unitId : undefined;
  if (checkId && !isNaN(checkId)) { return checkId; };
  checkId = 'sourceDoc' in doc && doc.sourceDoc && 'unitId' in doc.sourceDoc ? doc.sourceDoc.unitId : undefined;
  if (checkId && !isNaN(checkId)) { return checkId; };
  // If we made it here there was no id to pull
  throw new TypeError('Failed to parse - unable to locate related document id', { cause: { doc } });  
};  

/**
 * Deduplicates and merges a related document into a map keyed by id, merging descriptions if duplicate.
 *
 * @param map - The map to merge into.
 * @param doc - The related document to merge.
 * @param referencedItem - String describing the referencing context.
 */
const mergeToMap: MergeToMapOverloads = ({
  map,
  doc,
  referencedItem
}:{
  map: Map<number, RelatedDocumentSchemaType>;
  doc: RelatedDocumentSchemaType;
  referencedItem: string;
}
) => {
  const idValue = getRelatedDocumentId(doc);
  const currentDoc = map.get(idValue);

  // --- FIX: Always store description as an array if merging ---
  const newDescription = `${doc.description ? doc.description : 'describes'} linked to ${referencedItem}`;
  if(currentDoc) {    
    if (Array.isArray(currentDoc.description)) {
      currentDoc.description.push(newDescription);
    } else if (typeof currentDoc.description === 'string') {
      currentDoc.description = [currentDoc.description, newDescription];
    } else {
      currentDoc.description = [newDescription];
    }
  } else {
    // Always store as array for consistency if not present
    doc.description = [newDescription];
    map.set(idValue, compactNulls(doc));
  }
};

/**
 * Deduplicates and merges all related documents from a container into target/source maps.
 *
 * @param targetMap - Map for target documents.
 * @param sourceMap - Map for source documents.
 * @param container - Object containing docRel_targetDoc/docRel_sourceDoc arrays.
 * @param referencedItem - String describing the referencing context.
 */
const mergeToMaps = ({
  targetMap,
  sourceMap,
  container,
  referencedItem,
}: {
  targetMap: Map<number, TargetDocumentSchemaType>;
  sourceMap: Map<number, SourceDocumentSchemaType>;
  referencedItem: string;
  container:
    | object
    | {
        docRel_targetDoc?: TargetDocumentSchemaType[];
        docRel_sourceDoc?: SourceDocumentSchemaType[];
      };
}) => {
  if (!container) {
    return;
  }
  if ('docRel_targetDoc' in container) {
    container.docRel_targetDoc?.forEach((doc) => {
      mergeToMap({
        map: targetMap,
        doc,
        referencedItem,
      });
    });
    delete container.docRel_targetDoc;
  }
  if ('docRel_sourceDoc' in container) {
    container.docRel_sourceDoc?.forEach((doc) => {
      mergeToMap({
        map: sourceMap,
        doc,
        referencedItem,
      });
    });
    delete container.docRel_sourceDoc;
  }
};

/**
 * Compacts a base document property object, merging related docs and removing nulls.
 *
 * @template TRet - The document property type.
 * @param props - The document property object.
 * @param targetMap - Map for target documents.
 * @param sourceMap - Map for source documents.
 * @param unitId - The parent document's unitId.
 * @param refItemType - String describing the property type (email, attachment, etc).
 * @returns The compacted document property object.
 */
const compactDocPropBase = <TRet extends BaseDocumentPropertySchemaType['doc']>({
  props,
  targetMap,
  sourceMap,
  refItemType
}: {
  props: TRet;
  targetMap: Map<number, TargetDocumentSchemaType>;
  sourceMap: Map<number, SourceDocumentSchemaType>;
  unitId: number;
  refItemType: string;
}): TRet => {
  if (!props || typeof props !== 'object') {
    return props;
  }
  let itemId: string|number;

  switch (refItemType) {
    case 'email':
      itemId = props.emailId ?? props.unitId;
      break;
    case 'attachment':
      itemId = props.attachmentId ?? props.emailId ?? props.unitId;
      break;
    default:
      itemId = itemId = props.documentPropertyId ?? props.unitId;
      break;
  }
  mergeToMaps({
    targetMap,
    sourceMap,
    container: props,
    referencedItem: `<${refItemType}:${itemId}>`,
  });
  return compactNulls(props);
};

/**
 * Compacts a CTA (call-to-action) object, merging related docs and removing nulls.
 *
 * @param cta - The CTA object.
 * @param targetMap - Map for target documents.
 * @param sourceMap - Map for source documents.
 * @param unitId - The parent document's unitId.
 * @returns The compacted CTA object.
 */
const compactCta = ({
  cta,
  targetMap,
  sourceMap,
  unitId: documentUnitId,
}: {
  cta: CtaSchemaType['cta'];
  sourceMap: Map<number, SourceDocumentSchemaType>;
  targetMap: Map<number, TargetDocumentSchemaType>;
  unitId: number;
}): CtaSchemaType['cta'] => {
  return compactDocPropBase<any>({
    props: cta,
    targetMap,
    sourceMap,
    refItemType: 'cta',
    unitId: documentUnitId,
  });
};


/**
 * Compacts a CTA response object, merging related docs and removing nulls.
 *
 * @param response - The CTA response object.
 * @param targetMap - Map for target documents.
 * @param sourceMap - Map for source documents.
 * @param unitId - The parent document's unitId.
 * @returns The compacted CTA response object.
 */
const compactCtaResponse = ({
  response,
  targetMap,
  sourceMap,
  unitId: documentUnitId,
}: {
  response: CtaResponseSchemaType['response'];
  sourceMap: Map<number, SourceDocumentSchemaType>;
  targetMap: Map<number, TargetDocumentSchemaType>;
  unitId: number;
}): CtaResponseSchemaType['response'] => {
  if (!response || typeof response !== 'object') {
    return response;
  }
  if ('ctas' in response && Array.isArray(response.ctas)) {
    response.ctas = (response.ctas ?? [])
      .map((rec: Record<string, unknown>) => {
        rec = compactNulls(rec);
        rec.cta = compactCta({
          cta: rec.cta as any,
          targetMap,
          sourceMap,
          unitId: documentUnitId,
        });
        return compactNulls(rec);
      })
      .filter(Boolean);
  }
  return compactDocPropBase<any>({
    props: response,
    targetMap,
    sourceMap,
    refItemType: 'cta_response',
    unitId: documentUnitId,
  }) as CtaResponseSchemaType['response'];
};

/**
 * Compacts a document property, merging related docs, normalizing nested doc/cta/response, and removing nulls.
 *
 * @param docProps - The document property object.
 * @param targetMap - Map for target documents.
 * @param sourceMap - Map for source documents.
 * @param unitId - The parent document's unitId.
 * @returns The compacted document property object.
 */
const compactDocProp = ({
  docProps,
  targetMap,
  sourceMap,
  unitId: documentUnitId,
}: {
  docProps: DocumentPropertySchemaType | null | undefined;
  sourceMap: Map<number, SourceDocumentSchemaType>;
  targetMap: Map<number, TargetDocumentSchemaType>;
  unitId: number;
}): DocumentSchemaType['docProp'] => {
  if (docProps === null || docProps === undefined) {
    return docProps;
  }

  if (!docProps || typeof docProps !== 'object') {
    return docProps;
  }
  docProps = compactNulls(docProps);
  const refItemType =
    'documentType' in docProps && docProps.documentType
      ? String(docProps.documentType)        
      : 'attachmentId' in docProps ? 'attachmentId' : 'email';
  if ('doc' in docProps && docProps.doc) {
    if (typeof docProps.doc === 'object') {
      const unitId = 'unitId' in docProps.doc ? Number(docProps.doc.unitId) : undefined;
      // Remove self-referencing docs
      if (unitId && unitId === documentUnitId) {
        delete docProps.doc;      
      } else{
        docProps.doc = compactDocPropBase({
          props: docProps.doc,
          targetMap,
          sourceMap,
          refItemType,
          unitId: documentUnitId,
        }) as any;
      }    
    }
    if ('response' in docProps){
      docProps.response = compactCtaResponse({
        response: docProps.response as CtaResponseSchemaType['response'],
        targetMap,
        sourceMap,
        unitId: documentUnitId,
      });
    }  
    if ('cta' in docProps) {
      docProps.cta = compactCta({
        cta: docProps.cta as CtaSchemaType['cta'],
        targetMap,
        sourceMap,
        unitId: documentUnitId,
      });
    }  
    return compactNulls(docProps);
} 
};

/**
 * Compacts a full case file document, deduplicating related docs, removing nulls, and normalizing nested properties.
 *
 * - Deep clones the input document to avoid mutation.
 * - Deduplicates related documents (target/source) into flat maps.
 * - Compacts all docProp/docProps, removes duplicate attachment content, and pushes distinct related docs to root.
 *
 * @param document - The full case file document to compact.
 * @returns The compacted, deduplicated, and normalized document.
 */
export const compactCaseFileDocument = (
  document: DocumentSchemaType,
): DocumentSchemaType => {
  // Create a deep copy of the document to ensure original is not modified
  const target = JSON.parse(JSON.stringify(document)) as DocumentSchemaType;
  const makeDocMap = <TSchema extends RelatedDocumentSchemaType>({ source }: { source: Array<TSchema> | undefined | null }) => {
    const map = new Map<number, TSchema>();
    (source ?? []).forEach((doc: TSchema) => {
      const thisId = getRelatedDocumentId(doc);
      if (thisId == target.unitId) {
        return; // Skip self-referencing docs
      }
      if ('relationshipReasonId' in doc) {
        delete doc.relationshipReasonId;
      }
      
      const existing = map.get(thisId);
      if (existing) {
        // Merge descriptions when deduplicating
        const existingDesc = existing.description;
        const newDesc = doc.description;
        
        if (Array.isArray(existingDesc)) {
          if (newDesc && !existingDesc.includes(newDesc as string)) {
            existingDesc.push(newDesc as string);
          }
        } else if (existingDesc && newDesc && existingDesc !== newDesc) {
          existing.description = [existingDesc as string, newDesc as string];
        } else if (!existingDesc && newDesc) {
          existing.description = newDesc;
        }
      } else {
        map.set(thisId, doc);
      }
    });
    return map;
  };
  // Load any existing root-level related docs into maps
  const targetDocMap = makeDocMap({ source: target.docRel_targetDoc });
  const sourceDocMap = makeDocMap({ source: target.docRel_sourceDoc });
  // Document Properties
  target.docProp = compactDocProp({ docProps: target.docProp, targetMap: targetDocMap, sourceMap: sourceDocMap, unitId: target.unitId! })
  target.docProps = (target.docProps ?? []).map((dp) => compactDocProp({ docProps: dp, targetMap: targetDocMap, sourceMap: sourceDocMap, unitId: target.unitId! })!).filter(Boolean)
  // Stop duplicating attachment content
  if (target.email?.emailAttachments) {
    target.email.emailAttachments.forEach((att) => {
      if (Array.isArray(att.docs)){
        att.docs.forEach((doc) => {
          if ('content' in doc && doc.content){
            delete doc.content;
          }
        });
      } 
    });
  }

  // Push distinct related documents out to target
  target.docRel_targetDoc = Array.from(targetDocMap.values());
  target.docRel_sourceDoc = Array.from(sourceDocMap.values());
  return compactNulls(target, true);
};
