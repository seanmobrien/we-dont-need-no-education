import { compactCaseFileDocument } from '@/lib/ai/tools/getCaseFileDocument/compact-casefile-document';
import type { DocumentSchemaType } from '@/lib/ai/tools/schemas';

describe('compactCaseFileDocument', () => {
  it('removes null and undefined fields recursively', () => {
    const doc: DocumentSchemaType = {
      unitId: 1,
      docProp: {
        documentType: 'email',
        doc: { emailId: 2, foo: null, bar: undefined },
      },
      docProps: [
        { documentType: 'email', doc: { emailId: 3, baz: null } },
        null,
        undefined,
      ],
      docRel_targetDoc: [
        {
          targetDocumentId: 2,
          description: null,
          targetDoc: { unitId: 2, documentType: 'email', content: 'abc' },
        },
      ],
      docRel_sourceDoc: [
        {
          sourceDocumentId: 3,
          description: undefined,
          sourceDoc: { unitId: 3, documentType: 'email', content: 'def' },
        },
      ],
      email: {
        emailAttachments: [
          {
            docs: [
              {
                content: 'should be removed',
                unitId: 4,
                documentType: 'attachment',
              },
            ],
          },
        ],
      },
    } as unknown as DocumentSchemaType;
    const result = compactCaseFileDocument(doc);
    expect(result.docProp).not.toHaveProperty('foo');
    expect(result.docProp).not.toHaveProperty('bar');
    expect(
      result.docProps && result.docProps[0] && result.docProps[0].doc,
    ).not.toHaveProperty('baz');
    expect(result.docProps && result.docProps.length).toBe(1);
    expect(
      result.docRel_targetDoc && result.docRel_targetDoc[0],
    ).not.toHaveProperty('description', null);
    expect(
      result.docRel_sourceDoc && result.docRel_sourceDoc[0],
    ).not.toHaveProperty('description', undefined);
    expect(
      result.email &&
        result.email.emailAttachments &&
        result.email.emailAttachments[0] &&
        result.email.emailAttachments[0].docs &&
        result.email.emailAttachments[0].docs[0],
    ).not.toHaveProperty('content');
  });

  it('deduplicates related documents and merges descriptions', () => {
    const doc: DocumentSchemaType = {
      unitId: 1,
      docRel_targetDoc: [
        {
          targetDocumentId: 2,
          description: 'desc1',
          targetDoc: { unitId: 2, documentType: 'email', content: 'abc' },
        },
        {
          targetDocumentId: 2,
          description: 'desc2',
          targetDoc: { unitId: 2, documentType: 'email', content: 'abc' },
        },
      ],
      docProp: { documentType: 'email', doc: { emailId: 2 } },
      docProps: [],
    } as unknown as DocumentSchemaType;
    const result = compactCaseFileDocument(doc);
    expect(result.docRel_targetDoc && result.docRel_targetDoc.length).toBe(1);
    const desc =
      result.docRel_targetDoc &&
      result.docRel_targetDoc[0] &&
      result.docRel_targetDoc[0].description;
    expect(Array.isArray(desc)).toBe(true);
    expect(desc).toEqual(
      expect.arrayContaining([
        expect.stringContaining('desc1'),
        expect.stringContaining('desc2'),
      ]),
    );
  });

  it('removes self-referencing docProps', () => {
    const doc: DocumentSchemaType = {
      unitId: 1,
      docProp: { documentType: 'email', doc: { unitId: 1, emailId: 1 } },
      docProps: [],
    } as unknown as DocumentSchemaType;
    const result = compactCaseFileDocument(doc);
    expect(result.docProp).not.toHaveProperty('doc');
  });

  it('handles CTA and CTA response normalization', () => {
    const doc: DocumentSchemaType = {
      unitId: 1,
      docProp: {
        documentType: 'cta',
        doc: {
          cta: { foo: 'bar', baz: null },
          response: {
            ctas: [{ cta: { foo: 'bar', baz: null } }, { cta: { foo: 'baz' } }],
          },
        },
      },
      docProps: [],
    } as unknown as DocumentSchemaType;
    const result = compactCaseFileDocument(doc);
    type CtaDoc = {
      cta?: Record<string, unknown>;
      response?: { ctas: Array<{ cta: Record<string, unknown> }> };
    };
    const ctaDoc = result.docProp && (result.docProp.doc as CtaDoc | undefined);
    expect(ctaDoc && ctaDoc.cta).toBeDefined();
    expect(
      ctaDoc &&
        ctaDoc.response &&
        ctaDoc.response.ctas &&
        ctaDoc.response.ctas.length,
    ).toBe(2);
    expect(
      ctaDoc &&
        ctaDoc.response &&
        ctaDoc.response.ctas &&
        ctaDoc.response.ctas[0].cta,
    ).not.toHaveProperty('baz');
  });

  it('deep clones the input and does not mutate the original', () => {
    const doc: DocumentSchemaType = {
      unitId: 1,
      docProp: { documentType: 'email', doc: { emailId: 2 } },
      docProps: [],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
    const copy = JSON.parse(JSON.stringify(doc));
    const result = compactCaseFileDocument(doc);
    expect(doc).toEqual(copy);
    expect(result).not.toBe(doc);
  });
});
