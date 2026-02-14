export class MailQueryBuilder {
    #query;
    #messageIds;
    constructor() {
        this.#query = '';
        this.#messageIds = [];
    }
    get hasQuery() {
        return this.#query.length > 0;
    }
    appendQueryParam(queryKey, input) {
        const data = (Array.isArray(input) ? input : [input])
            .map((item) => item?.trim() ?? '')
            .filter(Boolean);
        if (data.length > 0) {
            this.#query += `${queryKey}:${data.join(` ${queryKey}:`)} `;
        }
        return this;
    }
    appendMessageId(messageId) {
        const normalize = (x) => {
            return x.replace(' ', '+');
        };
        if (Array.isArray(messageId)) {
            messageId.forEach((x) => this.appendMessageId(normalize(x)));
            return this;
        }
        if (this.#messageIds.includes(messageId)) {
            return this;
        }
        this.#messageIds.push(normalize(messageId));
        return this;
    }
    build() {
        let q = this.hasQuery
            ? this.#query.trim()
            : '' + this.buildMessageIdQuery();
        q = q.trim();
        return q.length > 0 ? q : undefined;
    }
    buildMessageIdQuery() {
        if (this.#messageIds.length === 0) {
            return '';
        }
        const key = 'rfc822msgid';
        if (this.#messageIds.length === 1) {
            return `${key}:${this.#messageIds[0]}`;
        }
        return '{' + this.#messageIds.map((id) => `${key}:${id}`).join(' ') + '}';
    }
}
//# sourceMappingURL=_mailQueryBuilder.js.map