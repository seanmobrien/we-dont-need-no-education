import type { IUrlBuilder, MappedPageOverloads } from './_types';
import { UrlBuilder } from './_impl';

/**
 * Factory function to create a MappedPageOverloads function.
 *
 * @param builder - The URL builder instance.
 * @param page - The page name.
 * @returns A function that generates URLs based on the provided slug and params.
 */
const mappedPageOverloadFactory = (
  builder: IUrlBuilder,
  page: string,
): MappedPageOverloads => {
  const ret: MappedPageOverloads = (
    slug?: string | number | object,
    params?: object,
  ) => {
    if (typeof slug === 'object') {
      return builder.page(page, slug);
    } else if (typeof slug === 'string' || typeof slug === 'number') {
      return builder.page(page, slug, params);
    } else {
      return builder.page(page, params);
    }
  };
  return ret;
};

/**
 * Represents a mapped URL builder interface that provides a structured way to build URLs
 * for various API endpoints and application features. This interface extends `IUrlBuilder`
 * and organizes URL-building logic into nested structures for better modularity and clarity.
 *
 * @interface MappedUrlBuilder
 *
 * @property {IUrlBuilder & { attachment: IUrlBuilder & { download: MappedPageOverloads; }; contact: MappedPageOverloads; doc: MappedPageOverloads; email: IUrlBuilder & { search: MappedPageOverloads; thread: MappedPageOverloads; stats: MappedPageOverloads; import: IUrlBuilder & { google: IUrlBuilder & { message: IUrlBuilder & { status: MappedPageOverloads; }; search: MappedPageOverloads; }; list: MappedPageOverloads; }; properties: (emailId: string) => IUrlBuilder & { callToAction: MappedPageOverloads; callToActionResponse: MappedPageOverloads; complianceScores: MappedPageOverloads; keyPoints: MappedPageOverloads; sentimentAnalysis: MappedPageOverloads; violationDetails: MappedPageOverloads; emailHeader: MappedPageOverloads; notes: MappedPageOverloads; }; }; }} api
 * A nested structure for API-related URL builders, including endpoints for attachments,
 * contacts, document units, and email-related operations such as search, thread, stats,
 * and import. Email properties include additional nested builders for specific features.
 *
 * @property {IUrlBuilder & { bulkEdit: MappedPageOverloads; edit: MappedPageOverloads; }} email
 * URL builders for email-related operations, including bulk editing and editing individual emails.
 *
 * @property {IUrlBuilder & { import: MappedPageOverloads; email: MappedPageOverloads; }} messages
 * URL builders for message-related operations, including importing messages and handling emails.
 */
export interface MappedUrlBuilder extends IUrlBuilder {
  /**
   * A nested structure for API-related URL builders, including endpoints for attachments,
   * contacts, document units, and email-related operations such as search, thread, stats,
   * and import. Email properties include additional nested builders for specific features.
   */
  api: IUrlBuilder & {
    /**
     * URL builders for attachment-related operations, including downloading attachments.
     */
    attachment: IUrlBuilder;
    /**
     * URL builder for contact-related operations.
     *
     * @param slug - Optional slug or object for the contact page.
     * @param params - Optional parameters for the contact page.
     * @returns A function that generates the URL for contacts.
     */
    contact: MappedPageOverloads;
    /**
     * URL builder for document unit-related operations.
     *
     * @param slug - Optional slug or object for the document unit page.
     * @param params - Optional parameters for the document unit page.
     * @returns A function that generates the URL for document units.
     */
    documentUnit: MappedPageOverloads;
    /**
     * URL builder for document unit-related operations.
     *
     * @param slug - Optional slug or object for the document unit page.
     * @param params - Optional parameters for the document unit page.
     * @returns A function that generates the URL for document units.
     */
    doc: MappedPageOverloads;
    /**
     * URL builder for email-related operations, including search, thread, stats,
     * and import. Email properties include additional nested builders for specific features.
     *
     * @param slug - Optional slug or object for the email page.
     * @param params - Optional parameters for the email page.
     * @returns A function that generates the URL for email-related operations.
     *
     * @property {IUrlBuilder & { search: MappedPageOverloads; thread: MappedPageOverloads; stats: MappedPageOverloads; import: IUrlBuilder & { google: IUrlBuilder & { message: IUrlBuilder & { status: MappedPageOverloads; }; search: MappedPageOverloads; }; list: MappedPageOverloads; }; properties: (emailId: string) => IUrlBuilder & { callToAction: MappedPageOverloads; callToActionResponse: MappedPageOverloads; complianceScores: MappedPageOverloads; keyPoints: MappedPageOverloads; sentimentAnalysis: MappedPageOverloads; violationDetails: MappedPageOverloads; emailHeader: MappedPageOverloads; notes: MappedPageOverloads; }; }} email
     * URL builders for email-related operations, including search, thread, stats,
     * import, and properties. The properties builder takes an email ID as a parameter
     * and provides additional nested builders for specific features such as
     * call-to-action, compliance scores, and sentiment analysis.
     *
     */
    email: IUrlBuilder & {
      /**
       * URL builder for searching emails.
       */
      search: MappedPageOverloads;
      /**
       * URL builder for email threads.
       */
      thread: MappedPageOverloads;
      /**
       * URL builder for email statistics.
       */
      stats: MappedPageOverloads;
      /**
       * URL builder for importing emails, including Google and list imports.
       */
      import: IUrlBuilder & {
        /**
         * URL builder for Google email imports, including message status and search.
         */
        google: IUrlBuilder & {
          /**
           * URL builder for Google email messages.
           */
          message: IUrlBuilder & {
            /**
             * URL builder for message status.
             *
             * @param slug - Optional slug or object for the message status page.
             * @param params - Optional parameters for the message status page.
             * @returns A function that generates the URL for message status.
             */
            status: MappedPageOverloads;
          };
          /**
           * URL builder for searching Google emails.
           *
           * @param slug - Optional slug or object for the search page.
           * @param params - Optional parameters for the search page.
           * @returns A function that generates the URL for searching Google emails.
           */
          search: MappedPageOverloads;
        };
        /**
         * URL builder for importing emails from a list.
         *
         * @param slug - Optional slug or object for the list page.
         * @param params - Optional parameters for the list page.
         * @returns A function that generates the URL for importing emails from a list.
         */
        list: MappedPageOverloads;
      };
      /**
       * URL builder for email properties, including various features such as
       * call-to-action, compliance scores, and sentiment analysis.
       *
       * @param emailId - The ID of the email for which to retrieve properties.
       * @returns A function that generates the URL for email properties.
       */
      properties: (emailId: string) => IUrlBuilder & {
        /**
         * URL builder for call-to-action properties.
         */
        callToAction: MappedPageOverloads;
        /**
         * URL builder for call-to-action response properties.
         */
        callToActionResponse: MappedPageOverloads;
        /**
         * URL builder for compliance scores properties.
         */
        complianceScores: MappedPageOverloads;
        /**
         * URL builder for key points properties.
         */
        keyPoints: MappedPageOverloads;
        /**
         * URL builder for sentiment analysis properties.
         */
        sentimentAnalysis: MappedPageOverloads;
        /**
         * URL builder for violation details properties.
         */
        violationDetails: MappedPageOverloads;
        /**
         * URL builder for email header properties.
         */
        emailHeader: MappedPageOverloads; // Added emailHeader
        /**
         * URL builder for notes properties.
         */
        notes: MappedPageOverloads;
      };
    };
  };
  /**
   * URL builders for email-related pages, including bulk editing and editing individual emails.
   */
  email: IUrlBuilder & {
    /**
     * URL builder for bulk editing emails.
     *
     * @param slug - Optional slug or object for the bulk edit page.
     * @param params - Optional parameters for the bulk edit page.
     * @returns A function that generates the URL for bulk editing emails.
     */
    bulkEdit: MappedPageOverloads;
    /**
     * URL builder for editing individual emails.
     *
     * @param slug - Optional slug or object for the edit page.
     * @param params - Optional parameters for the edit page.
     * @returns A function that generates the URL for editing individual emails.
     */
    edit: MappedPageOverloads;
  };
  /**
   * URL builders for message-related pages, including importing messages and handling emails.
   */
  messages: IUrlBuilder & {
    /**
     * URL builder for importing messages.
     *
     * @param slug - Optional slug or object for the import page.
     * @param params - Optional parameters for the import page.
     * @returns A function that generates the URL for importing messages.
     */
    import: MappedPageOverloads;
    /**
     * URL builder for handling emails.
     *
     * @param slug - Optional slug or object for the email page.
     * @param params - Optional parameters for the email page.
     * @returns A function that generates the URL for handling emails.
     */
    email: MappedPageOverloads;
  };
}

/**
 * Factory function to create a `MappedUrlBuilder` instance.
 *
 * This function initializes a `MappedUrlBuilder` object with a hierarchical structure
 * of URL segments and mapped page overloads. It provides a structured way to build
 * URLs for various API endpoints and other resources in the application.
 *
 * The returned `MappedUrlBuilder` includes nested properties and methods for constructing
 * URLs for specific API endpoints, such as `api.attachment.download`, `api.email.search`,
 * and more. It also supports dynamic URL generation for specific resources, such as
 * `api.email.properties(emailId)`.
 *
 * ### Example Usage
 * ```typescript
 * const urlBuilder = mappedUrlBuilderFactory();
 * const downloadUrl = urlBuilder.api.attachment.download();
 * const emailPropertiesUrl = urlBuilder.api.email.properties('12345').callToAction();
 * ```
 *
 * @returns {MappedUrlBuilder} A fully initialized `MappedUrlBuilder` instance with
 * nested URL segments and mapped page overloads.
 */
export const mappedUrlBuilderFactory = (): MappedUrlBuilder => {
  const ret = new UrlBuilder({
    parent: null,
    segment: '',
  }) as unknown as MappedUrlBuilder;
  ret.api = ret.child('api') as MappedUrlBuilder['api'];
  ret.api.attachment = ret.child(
    'attachment',
  ) as MappedUrlBuilder['api']['attachment'];
  ret.api.contact = mappedPageOverloadFactory(ret.api, 'contact');
  ret.api.documentUnit = mappedPageOverloadFactory(ret.api, 'document-unit');
  ret.api.email = ret.api.child('email') as MappedUrlBuilder['api']['email'];
  ret.api.email.search = mappedPageOverloadFactory(ret.api.email, 'search');
  ret.api.email.thread = mappedPageOverloadFactory(ret.api.email, 'thread');
  ret.api.email.stats = mappedPageOverloadFactory(ret.api.email, 'stats');
  ret.api.email.import = ret.api.email.child(
    'import',
  ) as MappedUrlBuilder['api']['email']['import'];
  ret.api.email.import.google = ret.api.email.import.child(
    'google',
  ) as MappedUrlBuilder['api']['email']['import']['google'];
  ret.api.email.import.google.message = ret.api.email.import.google.child(
    'message',
  ) as MappedUrlBuilder['api']['email']['import']['google']['message'];
  ret.api.email.import.google.message.status = mappedPageOverloadFactory(
    ret.api.email.import.google.message,
    'status',
  );
  ret.api.email.import.google.search = mappedPageOverloadFactory(
    ret.api.email.import.google,
    'search',
  );
  ret.api.email.import.list = mappedPageOverloadFactory(
    ret.api.email.import,
    'list',
  );

  ret.api.email.properties = (emailId: string) => {
    const properties = new UrlBuilder({
      parent: ret.api.email,
      segment: emailId,
      slug: 'properties',
    }) as Partial<ReturnType<MappedUrlBuilder['api']['email']['properties']>>;
    properties.callToAction = mappedPageOverloadFactory(
      properties as IUrlBuilder,
      'call-to-action',
    );
    properties.callToActionResponse = mappedPageOverloadFactory(
      properties as IUrlBuilder,
      'call-to-action-response',
    );
    properties.complianceScores = mappedPageOverloadFactory(
      properties as IUrlBuilder,
      'compliance-scores',
    );
    properties.keyPoints = mappedPageOverloadFactory(
      properties as IUrlBuilder,
      'key-points',
    );
    properties.sentimentAnalysis = mappedPageOverloadFactory(
      properties as IUrlBuilder,
      'sentiment-analysis',
    );
    properties.violationDetails = mappedPageOverloadFactory(
      properties as IUrlBuilder,
      'violation-details',
    );
    properties.emailHeader = mappedPageOverloadFactory(
      properties as IUrlBuilder,
      'email-header',
    );
    properties.notes = mappedPageOverloadFactory(
      properties as IUrlBuilder,
      'notes',
    );
    return properties as ReturnType<
      MappedUrlBuilder['api']['email']['properties']
    >;
  };
  ret.email = ret.child('email') as MappedUrlBuilder['email'];
  ret.email.bulkEdit = mappedPageOverloadFactory(ret.email, 'bulk-edit');
  ret.email.edit = mappedPageOverloadFactory(ret.email, 'edit');
  ret.messages = ret.child('messages') as MappedUrlBuilder['messages'];
  ret.messages.import = mappedPageOverloadFactory(ret.messages, 'import');
  ret.messages.email = mappedPageOverloadFactory(ret.messages, 'email');
  return ret as MappedUrlBuilder;
};
