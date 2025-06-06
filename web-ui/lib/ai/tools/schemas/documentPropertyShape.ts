import baseDocumentPropertyShape from './baseDocumentPropertyShape';
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

export default documentPropertyShape;
