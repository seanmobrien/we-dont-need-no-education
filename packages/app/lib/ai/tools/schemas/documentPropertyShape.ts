import baseDocumentPropertyShape from './base-document-property-shape';
import docPropCtaResponseShape from './docPropCtaResponseShape';
import docPropKeyPointShape from './docPropKeyPointShape';
import dockPropCtaShape from './docPropCtaShape';
import { z } from 'zod';

const documentPropertyShape = z
  .discriminatedUnion('documentPropertyTypeId', [
    docPropCtaResponseShape,
    docPropKeyPointShape,
    dockPropCtaShape,
  ])
  .or(baseDocumentPropertyShape);

export type BaseDocumentPropertySchemaType = typeof baseDocumentPropertyShape._output;
export type CtaResponseSchemaType = typeof docPropCtaResponseShape._output;
export type CtaKeyPointSchemaType = typeof docPropKeyPointShape._output;
export type CtaSchemaType = typeof dockPropCtaShape._output;

export default documentPropertyShape;
export type DocumentPropertySchemaType = typeof documentPropertyShape._output;