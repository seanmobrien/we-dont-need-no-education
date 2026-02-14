const compactNulls = (target, recurse = false) => {
    Object.keys(target).forEach((key) => {
        const k = key;
        const check = target[k];
        if (check === undefined || check === null) {
            delete target[k];
        }
        else if (recurse && typeof check === 'object') {
            if (Array.isArray(check)) {
                check.forEach((item) => compactNulls(item, true));
            }
            else {
                compactNulls(check, true);
            }
        }
    });
    return target;
};
const getRelatedDocumentId = (doc) => {
    let checkId = 'targetDocumentId' in doc ? Number(doc.targetDocumentId) : undefined;
    if (checkId && !isNaN(checkId)) {
        return checkId;
    }
    checkId =
        'sourceDocumentId' in doc ? Number(doc.sourceDocumentId) : undefined;
    if (checkId && !isNaN(checkId)) {
        return checkId;
    }
    checkId =
        'targetDoc' in doc && doc.targetDoc && 'unitId' in doc.targetDoc
            ? doc.targetDoc.unitId
            : undefined;
    if (checkId && !isNaN(checkId)) {
        return checkId;
    }
    checkId =
        'sourceDoc' in doc && doc.sourceDoc && 'unitId' in doc.sourceDoc
            ? doc.sourceDoc.unitId
            : undefined;
    if (checkId && !isNaN(checkId)) {
        return checkId;
    }
    throw new TypeError('Failed to parse - unable to locate related document id', { cause: { doc } });
};
const mergeToMap = ({ map, doc, referencedItem, }) => {
    const idValue = getRelatedDocumentId(doc);
    const currentDoc = map.get(idValue);
    const newDescription = `${doc.description ? doc.description : 'describes'} linked to ${referencedItem}`;
    if (currentDoc) {
        if (Array.isArray(currentDoc.description)) {
            currentDoc.description.push(newDescription);
        }
        else if (typeof currentDoc.description === 'string') {
            currentDoc.description = [currentDoc.description, newDescription];
        }
        else {
            currentDoc.description = [newDescription];
        }
    }
    else {
        doc.description = [newDescription];
        map.set(idValue, compactNulls(doc));
    }
};
const mergeToMaps = ({ targetMap, sourceMap, container, referencedItem, }) => {
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
const compactDocPropBase = ({ props, targetMap, sourceMap, refItemType, }) => {
    if (!props || typeof props !== 'object') {
        return props;
    }
    let itemId;
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
const compactCta = ({ cta, targetMap, sourceMap, unitId: documentUnitId, }) => {
    return compactDocPropBase({
        props: cta,
        targetMap,
        sourceMap,
        refItemType: 'cta',
        unitId: documentUnitId,
    });
};
const compactCtaResponse = ({ response, targetMap, sourceMap, unitId: documentUnitId, }) => {
    if (!response || typeof response !== 'object') {
        return response;
    }
    if ('ctas' in response && Array.isArray(response.ctas)) {
        response.ctas = (response.ctas ?? [])
            .map((rec) => {
            rec = compactNulls(rec);
            rec.cta = compactCta({
                cta: rec.cta,
                targetMap,
                sourceMap,
                unitId: documentUnitId,
            });
            return compactNulls(rec);
        })
            .filter(Boolean);
    }
    return compactDocPropBase({
        props: response,
        targetMap,
        sourceMap,
        refItemType: 'cta_response',
        unitId: documentUnitId,
    });
};
const compactDocProp = ({ docProps, targetMap, sourceMap, unitId: documentUnitId, }) => {
    if (docProps === null || docProps === undefined) {
        return docProps;
    }
    if (!docProps || typeof docProps !== 'object') {
        return docProps;
    }
    docProps = compactNulls(docProps);
    const refItemType = 'documentType' in docProps && docProps.documentType
        ? String(docProps.documentType)
        : 'attachmentId' in docProps
            ? 'attachmentId'
            : 'email';
    if ('doc' in docProps && docProps.doc) {
        if (typeof docProps.doc === 'object') {
            const unitId = 'unitId' in docProps.doc ? Number(docProps.doc.unitId) : undefined;
            if (unitId && unitId === documentUnitId) {
                delete docProps.doc;
            }
            else {
                docProps.doc = compactDocPropBase({
                    props: docProps.doc,
                    targetMap,
                    sourceMap,
                    refItemType,
                    unitId: documentUnitId,
                });
            }
        }
        if ('response' in docProps) {
            docProps.response = compactCtaResponse({
                response: docProps.response,
                targetMap,
                sourceMap,
                unitId: documentUnitId,
            });
        }
        if ('cta' in docProps) {
            docProps.cta = compactCta({
                cta: docProps.cta,
                targetMap,
                sourceMap,
                unitId: documentUnitId,
            });
        }
    }
    return compactNulls(docProps);
};
export const compactCaseFileDocument = (document) => {
    const target = JSON.parse(JSON.stringify(document));
    const makeDocMap = ({ source, }) => {
        const map = new Map();
        (source ?? []).forEach((doc) => {
            const thisId = getRelatedDocumentId(doc);
            if (thisId == target.unitId) {
                return;
            }
            if ('relationshipReasonId' in doc) {
                delete doc.relationshipReasonId;
            }
            const existing = map.get(thisId);
            if (existing) {
                const existingDesc = existing.description;
                const newDesc = doc.description;
                if (Array.isArray(existingDesc)) {
                    if (newDesc && !existingDesc.includes(newDesc)) {
                        existingDesc.push(newDesc);
                    }
                }
                else if (existingDesc && newDesc && existingDesc !== newDesc) {
                    existing.description = [existingDesc, newDesc];
                }
                else if (!existingDesc && newDesc) {
                    existing.description = newDesc;
                }
            }
            else {
                map.set(thisId, doc);
            }
        });
        return map;
    };
    const targetDocMap = makeDocMap({ source: target.docRel_targetDoc });
    const sourceDocMap = makeDocMap({ source: target.docRel_sourceDoc });
    target.docProp = compactDocProp({
        docProps: target.docProp,
        targetMap: targetDocMap,
        sourceMap: sourceDocMap,
        unitId: target.unitId,
    });
    target.docProps = (target.docProps ?? [])
        .map((dp) => compactDocProp({
        docProps: dp,
        targetMap: targetDocMap,
        sourceMap: sourceDocMap,
        unitId: target.unitId,
    }))
        .filter(Boolean);
    if (target.email?.emailAttachments) {
        target.email.emailAttachments.forEach((att) => {
            if (Array.isArray(att.docs)) {
                att.docs.forEach((doc) => {
                    if ('content' in doc && doc.content) {
                        delete doc.content;
                    }
                });
            }
        });
    }
    target.docRel_targetDoc = Array.from(targetDocMap.values());
    target.docRel_sourceDoc = Array.from(sourceDocMap.values());
    return compactNulls(target, true);
};
//# sourceMappingURL=compact-casefile-document.js.map