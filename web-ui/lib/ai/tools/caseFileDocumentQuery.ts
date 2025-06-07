import { sql } from 'drizzle-orm';
import type {
  DocumentPropertyQueryShape,
  DocumentUnitQueryShape,
} from '@/lib/drizzle-db';

export const documentPropertyShape: DocumentPropertyQueryShape = {
  columns: {
    documentPropertyTypeId: true,
    createdOn: true,
    policyBasis: true,
    tags: true,
    propertyValue: true,
  },
  with: {
    doc: {
      columns: {
        content: false,
        createdOn: false,
        embeddingModel: false,
        embeddedOn: false,
      },
      with: {
        docRel_targetDoc: {
          columns: {
            relationshipReasonId: true,
          },
          with: {
            sourceDoc: {
              columns: {
                unitId: true,
                content: true,
                documentType: true,
              },
            },
          },
          extras: {
            relationship:
              sql`(SELECT description FROM document_relationship_reason WHERE relation_reason_id = relationship_reason_id)`.as(
                'relationshipDescription',
              ),
          },
        },
      },
    },
    docPropType: {
      columns: {
        propertyName: true,
      },
    },
    cta: {
      columns: {
        propertyId: false,
        openedDate: true,
        closedDate: true,
        compliancyCloseDate: true,
        completionPercentage: true,
        complianceRating: true,
        complianceRatingReasons: true,
        inferred: true,
        complianceDateEnforceable: true,
        reasonableReasons: false,
        reasonableRequest: false,
        sentiment: true,
        sentimentReasons: true,
        severity: true,
        severityReason: true,
        titleIxApplicable: true,
        titleIxApplicableReasons: true,
        closureActions: true,
      },
      with: {
        cats: {
          columns: {},
          with: {
            callToActionCategory: {
              columns: {
                categoryName: true,
              },
            },
          },
        },
        responses: {
          columns: {
            completionPercentage: true,
            completionPercentageReasons: true,
            complianceChapter13: true,
            complianceChapter13Reasons: true,
          },
          with: {
            ctaResponse: {
              columns: {
                propertyId: false,
                complianceRating: true,
                complianceReasons: true,
                severity: true,
                severityReasons: true,
                sentiment: true,
                sentimentReasons: true,
              },
              with: {
                docProp: {
                  columns: {
                    propertyValue: true,
                    documentId: true,
                  },
                },
              },
            },
          },
        },
      },
    },
    response: {
      columns: {
        complianceRating: true,
        complianceReasons: true,
        severity: true,
        severityReasons: true,
        sentiment: true,
        sentimentReasons: true,
      },
      with: {
        ctas: {
          columns: {
            completionPercentage: true,
            completionPercentageReasons: true,
            complianceChapter13: true,
            complianceChapter13Reasons: true,
          },
          with: {
            cta: {
              columns: {
                propertyId: false,
                openedDate: true,
                closedDate: true,
                compliancyCloseDate: true,
                complianceRating: true,
                complianceRatingReasons: true,
                inferred: true,
                complianceDateEnforceable: true,
                reasonableReasons: false,
                reasonableRequest: false,
                sentiment: true,
                sentimentReasons: true,
                severity: true,
                severityReason: true,
                titleIxApplicable: true,
                titleIxApplicableReasons: true,
              },
              with: {
                docProp: {
                  columns: {
                    propertyValue: true,
                    documentId: true,
                  },
                },
              },
            },
          },
        },
      },
    },
    keyPoint: {
      columns: {
        relevance: true,
        compliance: true,
        severityRanking: true,
        inferred: true,
      },
    },
    violation: {
      columns: {
        violationType: true,
        severityLevel: true,
        severityReasons: true,
        violationReasons: true,
        titleIxRelevancy: true,
        chapt13Relevancy: true,
        ferpaRelevancy: true,
        otherRelevancy: true,
      },
    },
  },
};

export const caseFileDocumentShape: DocumentUnitQueryShape = {
  columns: {
    unitId: true,
    attachmentId: true,
    documentPropertyId: true,
    documentType: true,
    emailId: true,
    content: true,
    createdOn: true,
  },
  with: {
    docRel_sourceDoc: {
      columns: {
        targetDocumentId: true,
        relationshipReasonId: true,
      },
      with: {
        targetDoc: {
          columns: {
            documentType: true,
            content: true,
          },
        },
      },
      extras: {
        description:
          sql`(SELECT description FROM document_relationship_reason WHERE relation_reason_id = relationship_reason_id)`.as(
            'description',
          ),
      },
    },

    docRel_targetDoc: {
      columns: {
        sourceDocumentId: true,
        relationshipReasonId: true,
      },
      with: {
        sourceDoc: {
          columns: {
            documentType: true,
            content: true,
          },
        },
      },
      extras: {
        description:
          sql`(SELECT description FROM document_relationship_reason WHERE relation_reason_id = relationship_reason_id)`.as(
            'description',
          ),
      },
    },
    emailAttachment: {
      columns: {
        attachmentId: false,
        fileName: true,
        size: true,
        mimeType: true,
        extractedText: false,
      },
    },
    docProp: {
      ...documentPropertyShape,
      columns: {
        ...documentPropertyShape.columns,
        propertyValue: false,
      },
    },
    docProps: {
      ...documentPropertyShape,
      columns: {
        ...documentPropertyShape.columns,
        propertyId: true,
      },
      where: (dp, { inArray }) =>
        inArray(dp.documentPropertyTypeId, [
          4, // EmailPropertyTypeTypeId.CallToAction
          5, // EmailPropertyTypeTypeId.CallToActionResponse,
          6, //EmailPropertyTypeTypeId.ComplianceScore,
          7, //EmailPropertyTypeTypeId.ViolationDetails,
          8, //EmailPropertyTypeTypeId.SentimentAnalysis,
          9, //EmailPropertyTypeTypeId.KeyPoints,
          102, //EmailPropertyTypeTypeId.Note,
          1000, //  EmailPropertyTypeTypeId.ManualReview,
        ]),
    },
    email: {
      columns: {
        importedFromId: false,
        senderId: false,
        emailContents: false,
        threadId: true,
      },
      with: {
        sender: {
          columns: {
            contactId: false,
          },
        },
        emailRecipients: {
          columns: {
            recipientId: true,
            emailId: true,
            recipientType: true,
          },
          with: {
            recipient: {
              columns: {
                contactId: false,
                name: true,
                isDistrictStaff: true,
                email: true,
                roleDscr: true,
              },
            },
          },
        },
        emailAttachments: {
          columns: {
            attachmentId: false,
            fileName: true,
            size: true,
            mimeType: true,
            extractedText: true,
          },
          with: {
            docs: {
              columns: {
                unitId: true,
                content: true,
              },
            },
          },
        },
        inReplyTo: {
          columns: {
            emailId: false,
            subject: true,
          },
          with: {
            doc: {
              columns: {
                unitId: true,
                content: true,
                createdOn: true,
              },
            },
            sender: {
              columns: {
                contactId: false,
                name: true,
                isDistrictStaff: true,
                email: true,
                roleDscr: true,
              },
            },
            emailAttachments: {
              columns: {
                fileName: true,
                extractedText: true,
              },
              with: {
                docs: {
                  columns: {
                    unitId: true,
                    createdOn: true,
                  },
                },
              },
            },
          },
        },
        repliesTo: {
          columns: {
            emailId: false,
            subject: true,
          },
          with: {
            doc: {
              columns: {
                unitId: true,
                content: true,
                createdOn: true,
              },
            },
            sender: {
              columns: {
                contactId: false,
                name: true,
                isDistrictStaff: true,
                email: true,
                roleDscr: true,
              },
            },
            emailAttachments: {
              columns: {
                fileName: true,
                extractedText: true,
              },
              with: {
                docs: {
                  columns: {
                    unitId: true,
                    createdOn: true,
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};
