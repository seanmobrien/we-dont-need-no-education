/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from 'axios';
import { fetch } from '@/lib/nextjs-util/fetch';
import {
  AllUsers,
  ProjectOptions,
  Memory,
  MemoryHistory,
  MemoryOptions,
  MemoryUpdateBody,
  ProjectResponse,
  PromptUpdatePayload,
  SearchOptions,
  Webhook,
  WebhookPayload,
  Message,
  FeedbackPayload,
} from './mem0.types';
import { captureClientEvent, generateHash } from './telemetry';
import { getMem0ApiUrl } from '../pollyfills';
import { LoggedError } from '@/lib/react-util/errors/logged-error';
import type { ImpersonationService } from '@/lib/auth/impersonation';
import { env } from '@/lib/site-util/env';
import { log } from '@/lib/logger';
import { apikeys } from 'googleapis/build/src/apis/apikeys';
import {
  createInstrumentedSpan,
  reportEvent,
} from '@/lib/nextjs-util/server/utils';
import type { Span } from '@opentelemetry/api';

class APIError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'APIError';
  }
}

interface ClientOptions {
  apiKey?: string;
  bearerToken?: string;
  host?: string;
  organizationName?: string;
  projectName?: string;
  organizationId?: string;
  projectId?: string;
  impersonation?: ImpersonationService;
}

type PingResponse = {
  email: string;
  projectId?: string | null;
  orgId?: string;
  orgName?: string;
  projectName?: string | null;
  projects?: any[];
  user_id: string;
  status?: 'ok' | 'error';
  message?: string;
};

export default class MemoryClient {
  apiKey?: string;
  bearerToken?: string;
  host: string;
  organizationName: string | null;
  projectName: string | null;
  organizationId: string | number | null;
  projectId: string | number | null;
  headers: Record<string, string>;
  telemetryId: string;
  impersonation?: ImpersonationService;
  #defaultOptions: Partial<RequestInit>;
  #clientInitialized = false;

  _validateAuth(): any {
    if (this.impersonation) {
      return;
    }
    if (!this.apiKey && !this.bearerToken) {
      throw new Error('Either Mem0 API key or bearer token is required');
    }
    if (this.apiKey && typeof this.apiKey !== 'string') {
      throw new Error('Mem0 API key must be a string');
    }
    if (this.apiKey && this.apiKey.trim() === '') {
      throw new Error('Mem0 API key cannot be empty');
    }
    if (this.bearerToken && typeof this.bearerToken !== 'string') {
      throw new Error('Bearer token must be a string');
    }
    if (this.bearerToken && this.bearerToken.trim() === '') {
      throw new Error('Bearer token cannot be empty');
    }
  }

  _validateOrgProject(): void {
    // Check for organizationName/projectName pair
    if (
      (!this.organizationName && !!this.projectName) ||
      (!!this.organizationName && !this.projectName)
    ) {
      console.warn(
        'Warning: Both organizationName and projectName must be provided together when using either. This will be removed from version 1.0.40. Note that organizationName/projectName are being deprecated in favor of organizationId/projectId.',
      );
    }
  }

  constructor(options: ClientOptions) {
    this.apiKey = options.apiKey;
    this.bearerToken = options.bearerToken;
    this.host = options.host || getMem0ApiUrl('/');
    this.organizationName = options.organizationName || null;
    this.projectName = options.projectName || null;
    this.organizationId = options.organizationId || null;
    this.projectId = options.projectId || null;
    this.impersonation = options.impersonation;

    this.headers = {
      'Content-Type': 'application/json',
    };

    this.#defaultOptions = {
      headers: this.headers,
    };

    this._validateAuth();

    // Initialize with a temporary ID that will be updated
    this.telemetryId = '';
  }

  private async _initializeClient() {
    try {
      // Generate telemetry ID
      await this.ping();

      if (!this.telemetryId) {
        this.telemetryId = generateHash(
          this.apiKey || this.bearerToken || 'anonymous',
        );
      }

      this._validateOrgProject();

      // Capture initialization event
      reportEvent({
        eventName: 'init',
        additionalData: {
          api_version: 'v1',
          client_type: 'MemoryClient',
        },
      }).catch((error: any) => {
        LoggedError.isTurtlesAllTheWayDownBaby(error, {
          log: true,
          source: 'captureClientEvent',
        });
      });
      this.#clientInitialized = true;
    } catch (error: any) {
      this.#clientInitialized = false;
      LoggedError.isTurtlesAllTheWayDownBaby(error, {
        log: true,
        source: 'initializeClient',
      });
      await reportEvent({
        eventName: 'init_error',
        additionalData: {
          error: error?.message || 'Unknown error',
          stack: error?.stack || 'No stack trace',
        },
      });
    }
  }

  private _captureEvent(methodName: string, args: any[]) {
    reportEvent({
      eventName: methodName,
      additionalData: {
        success: true,
        args_count: args.length,
        keys: args.length ? args[0] : [],
      },
    }).catch((error: any) => {
      console.error('Failed to capture event:', error);
    });
  }
  /**
   * Updates the authorization header with an impersonated token if available.
   * @private
   */
  async #updateAuthorizationIfNeeded(): Promise<void> {
    const thisImpersonate = this.impersonation;
    if (thisImpersonate) {
      try {
        const impersonatedToken = await thisImpersonate.getImpersonatedToken();
        if (impersonatedToken) {
          this.bearerToken = impersonatedToken;
          log((l) =>
            l.verbose(
              `mem0 client is impersonating ${thisImpersonate.getUserContext().userId}.`,
            ),
          );
        } else {
          log((l) =>
            l.warn(
              `mem0 client unable to impersonate user, request will be made anonymously or via API key`,
            ),
          );
        }
      } catch (error) {
        LoggedError.isTurtlesAllTheWayDownBaby(error, {
          log: true,
          source: 'mem0Client::updateAuthorizationIfNeeded',
        });
      }
      if (this.bearerToken) {
        this.headers.Authorization = `Bearer ${this.bearerToken}`;
        return;
      }
      // Fallback to API key if available
      const apiKey = env('MEM0_API_KEY');
      if (apiKey) {
        this.headers.Authorization = `Token ${apiKey}`;
      }
    }
  }

  async _fetchWithErrorHandling<TResult = any>(
    url: string,
    options: any,
  ): Promise<TResult> {
    // Initialize client if not already done
    if (!this.#clientInitialized && !url.includes('ping')) {
      await this._initializeClient();
    }
    // Authenticate
    await this.#updateAuthorizationIfNeeded();
    // normalize input url
    const normalUrl = url.toLocaleLowerCase().trim();
    const isSwaggerDocs = normalUrl === 'docs';
    const requestUrl = isSwaggerDocs
      ? new URL('docs', env('MEM0_API_HOST')).toString()
      : new URL(normalUrl, this.host).toString();
    const response = await fetch(requestUrl, {
      ...options,
      headers: {
        ...this.headers,
        ...options.headers,
        'X-Mem0-User-ID': this.telemetryId,
      },
    });
    if (!response.ok) {
      const errorData = await response.text();
      throw new APIError(`API request failed: ${errorData}`);
    }
    if (isSwaggerDocs) {
      return (await response.text()) as unknown as TResult;
    }
    return await response.json();
  }

  _preparePayload(messages: Array<Message>, options: MemoryOptions): object {
    const payload: any = {};
    payload.messages = messages;
    return { ...payload, ...options };
  }

  _prepareParams(options: MemoryOptions): Record<string, string> {
    return Object.fromEntries(
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      Object.entries(options ?? {})
        .filter(([_, v]) => !!v)
        .map(([k, v]) => [
          k,
          typeof v === 'object' ? JSON.stringify(v) : String(v),
        ]),
    );
  }

  async _instrument<TResult>(
    name: string,
    fn: (span: Span) => Promise<TResult>,
  ): Promise<TResult> {
    const spanName = `mem0Client::${name}`;
    const attributes = {
      'mem0.component': 'mem0',
      'mem0.method': name,
      'mem0.host': this.host,
      'mem0.telemetryId': this.telemetryId || '',
      'mem0.org.id':
        this.organizationId !== null && this.organizationId !== undefined
          ? String(this.organizationId)
          : '',
      'mem0.project.id':
        this.projectId !== null && this.projectId !== undefined
          ? String(this.projectId)
          : '',
      'mem0.org.name': this.organizationName || '',
      'mem0.project.name': this.projectName || '',
      'mem0.impersonating': Boolean(this.impersonation),
      'mem0.auth.hasApiKey': Boolean(this.apiKey),
      'mem0.auth.hasBearer': Boolean(this.bearerToken),
      'mem0.version': 'v1',
    };
    try {
      const instrumentedSpan = await createInstrumentedSpan({
        spanName,
        attributes,
      });
      return await instrumentedSpan.executeWithContext(fn);
    } catch (error: unknown) {
      throw error;
    }
  }

  async ping(): Promise<void> {
    return this._instrument('ping', async () => {
      try {
        const response = await this._fetchWithErrorHandling<PingResponse>(
          '/api/v1/ping/',
          {
            method: 'GET',
          },
        );

        if (!response || typeof response !== 'object') {
          throw new APIError('Invalid response format from ping endpoint');
        }

        if (response.status && response.status !== 'ok') {
          throw new APIError(response.message || 'API Key is invalid');
        }

        const { orgId, orgName, projectId, projectName, email } = response;

        // Only update if values are actually present
        if (orgId && !this.organizationId) {
          this.organizationId = orgId;
        }
        if (orgName && !this.organizationName) {
          this.organizationName = orgName;
        }
        if (projectId && !this.projectId) {
          this.projectId = projectId;
        }
        if (projectName && !this.projectName) {
          this.projectName = projectName;
        }
        if (email) {
          this.telemetryId = generateHash(email);
        }
      } catch (error: any) {
        // Convert generic errors to APIError with meaningful messages
        if (error instanceof APIError) {
          throw LoggedError.isTurtlesAllTheWayDownBaby(error, {
            log: true,
            source: 'mem0Client::ping',
          });
        } else {
          const le = LoggedError.isTurtlesAllTheWayDownBaby(error, {
            log: true,
            source: 'mem0Client::ping',
          });
          throw new APIError(
            `Failed to ping server: ${error.message || 'Unknown error'}`,
          );
        }
      }
    });
  }

  async add(
    messages: Array<Message>,
    options: MemoryOptions = {},
  ): Promise<Array<Memory>> {
    return this._instrument('add', async (span) => {
      this._validateOrgProject();
      if (this.organizationName != null && this.projectName != null) {
        options.org_name = this.organizationName;
        options.project_name = this.projectName;
      }

      if (this.organizationId != null && this.projectId != null) {
        options.org_id = this.organizationId;
        options.project_id = this.projectId;

        if (options.org_name) delete options.org_name;
        if (options.project_name) delete options.project_name;
      }

      if (options.api_version) {
        options.version = options.api_version.toString();
      }

      const payload = this._preparePayload(messages, options);

      // get payload keys whose value is not null or undefined
      const payloadKeys = Object.keys(payload);
      this._captureEvent('add', [payloadKeys]);

      const response = await this._fetchWithErrorHandling(`api/v1/memories/`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(payload),
      });
      return response;
    });
  }

  async update(memoryId: string, message: string): Promise<Array<Memory>> {
    return this._instrument('update', async (span) => {
      this._validateOrgProject();
      const payload = {
        text: message,
      };

      const payloadKeys = Object.keys(payload);
      this._captureEvent('update', [payloadKeys]);

      const response = await this._fetchWithErrorHandling(
        `api/v1/memories/${memoryId}/`,
        {
          method: 'PUT',
          headers: this.headers,
          body: JSON.stringify(payload),
        },
      );
      return response;
    });
  }

  async get(memoryId: string): Promise<Memory> {
    return this._instrument('get', async (span) => {
      this._captureEvent('get', []);
      return this._fetchWithErrorHandling(`api/v1/memories/${memoryId}/`, {
        headers: this.headers,
      });
    });
  }

  async getAll(options?: SearchOptions): Promise<Array<Memory>> {
    return this._instrument('getAll', async (span) => {
      this._validateOrgProject();
      const payloadKeys = Object.keys(options || {});
      this._captureEvent('get_all', [payloadKeys]);
      const { api_version, page, page_size, ...otherOptions } = options!;
      if (this.organizationName != null && this.projectName != null) {
        otherOptions.org_name = this.organizationName;
        otherOptions.project_name = this.projectName;
      }

      let appendedParams = '';
      let paginated_response = false;

      if (page && page_size) {
        appendedParams += `page=${page}&page_size=${page_size}`;
        paginated_response = true;
      }

      if (this.organizationId != null && this.projectId != null) {
        otherOptions.org_id = this.organizationId;
        otherOptions.project_id = this.projectId;

        if (otherOptions.org_name) delete otherOptions.org_name;
        if (otherOptions.project_name) delete otherOptions.project_name;
      }

      if (api_version === 'v2') {
        const url = paginated_response
          ? `${this.host}/v2/memories/?${appendedParams}`
          : `${this.host}/v2/memories/`;
        return this._fetchWithErrorHandling(url, {
          method: 'POST',
          headers: this.headers,
          body: JSON.stringify(otherOptions),
        });
      } else {
        const params = new URLSearchParams(this._prepareParams(otherOptions));
        const url = paginated_response
          ? `api/v1/memories/?${params}&${appendedParams}`
          : `api/v1/memories/?${params}`;
        return this._fetchWithErrorHandling(url, {
          headers: this.headers,
        });
      }
    });
  }

  async search(query: string, options?: SearchOptions): Promise<Array<Memory>> {
    return this._instrument('search', async (span) => {
      this._validateOrgProject();
      const payloadKeys = Object.keys(options || {});
      this._captureEvent('search', [payloadKeys]);
      const { api_version, ...otherOptions } = options!;
      const payload = { query, ...otherOptions };
      if (this.organizationName != null && this.projectName != null) {
        payload.org_name = this.organizationName;
        payload.project_name = this.projectName;
      }

      if (this.organizationId != null && this.projectId != null) {
        payload.org_id = this.organizationId;
        payload.project_id = this.projectId;

        if (payload.org_name) delete payload.org_name;
        if (payload.project_name) delete payload.project_name;
      }
      const endpoint =
        api_version === 'v2' ? '/v2/memories/search/' : '/v1/memories/search/';
      const response = await this._fetchWithErrorHandling(
        `${this.host}${endpoint}`,
        {
          method: 'POST',
          headers: this.headers,
          body: JSON.stringify(payload),
        },
      );
      return response;
    });
  }

  async delete(memoryId: string): Promise<{ message: string }> {
    return this._instrument('delete', async (span) => {
      this._captureEvent('delete', [memoryId]);
      return this._fetchWithErrorHandling(`api/v1/memories/${memoryId}/`, {
        method: 'DELETE',
        headers: this.headers,
      });
    });
  }

  async deleteAll(options: MemoryOptions = {}): Promise<{ message: string }> {
    return this._instrument('deleteAll', async (span) => {
      this._validateOrgProject();
      const payloadKeys = Object.keys(options || {});
      this._captureEvent('delete_all', [payloadKeys]);
      if (this.organizationName != null && this.projectName != null) {
        options.org_name = this.organizationName;
        options.project_name = this.projectName;
      }

      if (this.organizationId != null && this.projectId != null) {
        options.org_id = this.organizationId;
        options.project_id = this.projectId;

        if (options.org_name) delete options.org_name;
        if (options.project_name) delete options.project_name;
      }
      const params = new URLSearchParams(this._prepareParams(options));
      const response = await this._fetchWithErrorHandling(
        `api/v1/memories/?${params}`,
        {
          method: 'DELETE',
          headers: this.headers,
        },
      );
      return response;
    });
  }

  async history(memoryId: string): Promise<Array<MemoryHistory>> {
    return this._instrument('history', async (span) => {
      this._captureEvent('history', []);
      const response = await this._fetchWithErrorHandling(
        `api/v1/memories/${memoryId}/history/`,
        {
          headers: this.headers,
        },
      );
      return response;
    });
  }

  async users(): Promise<AllUsers> {
    return this._instrument('users', async (span) => {
      this._validateOrgProject();
      this._captureEvent('users', []);
      const options: MemoryOptions = {};
      if (this.organizationName != null && this.projectName != null) {
        options.org_name = this.organizationName;
        options.project_name = this.projectName;
      }

      if (this.organizationId != null && this.projectId != null) {
        options.org_id = this.organizationId;
        options.project_id = this.projectId;

        if (options.org_name) delete options.org_name;
        if (options.project_name) delete options.project_name;
      }
      // @ts-expect-error 3rd party code
      const params = new URLSearchParams(options);
      const response = await this._fetchWithErrorHandling(
        `api/v1/entities/?${params}`,
        {
          headers: this.headers,
        },
      );
      return response;
    });
  }

  /**
   * @deprecated The method should not be used, use `deleteUsers` instead. This will be removed in version 2.2.0.
   */
  async deleteUser(data: {
    entity_id: number;
    entity_type: string;
  }): Promise<{ message: string }> {
    this._captureEvent('delete_user', []);
    if (!data.entity_type) {
      data.entity_type = 'user';
    }
    const response = await this._fetchWithErrorHandling(
      `api/v1/entities/${data.entity_type}/${data.entity_id}/`,
      {
        method: 'DELETE',
        headers: this.headers,
      },
    );
    return response;
  }

  async deleteUsers(
    params: {
      user_id?: string;
      agent_id?: string;
      app_id?: string;
      run_id?: string;
    } = {},
  ): Promise<{ message: string }> {
    return this._instrument('deleteUsers', async (span) => {
      this._validateOrgProject();

      let to_delete: Array<{ type: string; name: string }> = [];
      const { user_id, agent_id, app_id, run_id } = params;

      if (user_id) {
        to_delete = [{ type: 'user', name: user_id }];
      } else if (agent_id) {
        to_delete = [{ type: 'agent', name: agent_id }];
      } else if (app_id) {
        to_delete = [{ type: 'app', name: app_id }];
      } else if (run_id) {
        to_delete = [{ type: 'run', name: run_id }];
      } else {
        const entities = await this.users();
        to_delete = entities.results.map((entity) => ({
          type: entity.type,
          name: entity.name,
        }));
      }

      if (to_delete.length === 0) {
        throw new Error('No entities to delete');
      }

      const requestOptions: Record<string, string> = {};
      if (this.organizationId && this.projectId) {
        requestOptions.org_id = String(this.organizationId);
        requestOptions.project_id = String(this.projectId);
      } else if (this.organizationName && this.projectName) {
        requestOptions.org_name = encodeURIComponent(this.organizationName);
        requestOptions.project_name = encodeURIComponent(this.projectName);
      }
      const qp = new URLSearchParams(requestOptions);

      // Delete each entity and handle errors
      for (const entity of to_delete) {
        try {
          await this._fetchWithErrorHandling(
            `/v2/entities/${entity.type}/${entity.name}/${qp.size > 0 ? `?${qp.toString()}` : ''}`,
            {
              method: 'DELETE',
            },
          );
        } catch (error: any) {
          throw new APIError(
            `Failed to delete ${entity.type} ${entity.name}: ${error.message}`,
          );
        }
      }

      this._captureEvent('delete_users', [
        {
          user_id: user_id,
          agent_id: agent_id,
          app_id: app_id,
          run_id: run_id,
          sync_type: 'sync',
        },
      ]);

      return {
        message:
          user_id || agent_id || app_id || run_id
            ? 'Entity deleted successfully.'
            : 'All users, agents, apps and runs deleted.',
      };
    });
  }

  async batchUpdate(memories: Array<MemoryUpdateBody>): Promise<string> {
    return this._instrument('batchUpdate', async (span) => {
      this._captureEvent('batch_update', []);
      const memoriesBody = memories.map((memory) => ({
        memory_id: memory.memoryId,
        text: memory.text,
      }));
      const response = await this._fetchWithErrorHandling(`api/v1/batch/`, {
        method: 'PUT',
        headers: this.headers,
        body: JSON.stringify({ memories: memoriesBody }),
      });
      return response;
    });
  }

  async batchDelete(memories: Array<string>): Promise<string> {
    return this._instrument('batchDelete', async (span) => {
      this._captureEvent('batch_delete', []);
      const memoriesBody = memories.map((memory) => ({
        memory_id: memory,
      }));
      const response = await this._fetchWithErrorHandling(`api/v1/batch/`, {
        method: 'DELETE',
        headers: this.headers,
        body: JSON.stringify({ memories: memoriesBody }),
      });
      return response;
    });
  }

  async getProject(options: ProjectOptions): Promise<ProjectResponse> {
    return this._instrument('getProject', async (span) => {
      this._validateOrgProject();
      const payloadKeys = Object.keys(options || {});
      this._captureEvent('get_project', [payloadKeys]);
      const { fields } = options;

      if (!(this.organizationId && this.projectId)) {
        throw new Error(
          'organizationId and projectId must be set to access instructions or categories',
        );
      }

      const params = new URLSearchParams();
      fields?.forEach((field) => params.append('fields', field));

      const response = await this._fetchWithErrorHandling(
        `api/v1/orgs/organizations/${this.organizationId}/projects/${this.projectId}/?${params.toString()}`,
        {
          headers: this.headers,
        },
      );
      return response;
    });
  }

  async updateProject(
    prompts: PromptUpdatePayload,
  ): Promise<Record<string, any>> {
    return this._instrument('updateProject', async (span) => {
      this._validateOrgProject();
      this._captureEvent('update_project', []);
      if (!(this.organizationId && this.projectId)) {
        throw new Error(
          'organizationId and projectId must be set to update instructions or categories',
        );
      }

      const response = await this._fetchWithErrorHandling(
        `api/v1/orgs/organizations/${this.organizationId}/projects/${this.projectId}/`,
        {
          method: 'PATCH',
          headers: this.headers,
          body: JSON.stringify(prompts),
        },
      );
      return response;
    });
  }

  // WebHooks
  async getWebhooks(data?: { projectId?: string }): Promise<Array<Webhook>> {
    return this._instrument('getWebhooks', async (span) => {
      this._captureEvent('get_webhooks', []);
      const project_id = data?.projectId || this.projectId;
      const response = await this._fetchWithErrorHandling(
        `api/v1/webhooks/projects/${project_id}/`,
        {
          headers: this.headers,
        },
      );
      return response;
    });
  }

  async createWebhook(webhook: WebhookPayload): Promise<Webhook> {
    return this._instrument('createWebhook', async (span) => {
      this._captureEvent('create_webhook', []);
      const response = await this._fetchWithErrorHandling(
        `api/v1/webhooks/projects/${this.projectId}/`,
        {
          method: 'POST',
          headers: this.headers,
          body: JSON.stringify(webhook),
        },
      );
      return response;
    });
  }

  async updateWebhook(webhook: WebhookPayload): Promise<{ message: string }> {
    return this._instrument('updateWebhook', async (span) => {
      this._captureEvent('update_webhook', []);
      const project_id = webhook.projectId || this.projectId;
      const response = await this._fetchWithErrorHandling(
        `api/v1/webhooks/${webhook.webhookId}/`,
        {
          method: 'PUT',
          headers: this.headers,
          body: JSON.stringify({
            ...webhook,
            projectId: project_id,
          }),
        },
      );
      return response;
    });
  }

  async deleteWebhook(data: {
    webhookId: string;
  }): Promise<{ message: string }> {
    return this._instrument('deleteWebhook', async (span) => {
      this._captureEvent('delete_webhook', []);
      const webhook_id = data.webhookId || data;
      const response = await this._fetchWithErrorHandling(
        `api/v1/webhooks/${webhook_id}/`,
        {
          method: 'DELETE',
          headers: this.headers,
        },
      );
      return response;
    });
  }

  async feedback(data: FeedbackPayload): Promise<{ message: string }> {
    return this._instrument('feedback', async (span) => {
      const payloadKeys = Object.keys(data || {});
      this._captureEvent('feedback', [payloadKeys]);
      const response = await this._fetchWithErrorHandling(`api/v1/feedback/`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(data),
      });
      return response;
    });
  }
}

export { MemoryClient };
