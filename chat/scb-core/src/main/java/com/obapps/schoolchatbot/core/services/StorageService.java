package com.obapps.schoolchatbot.core.services;

import com.azure.storage.blob.BlobServiceClient;
import com.azure.storage.blob.BlobServiceClientBuilder;
import com.azure.storage.common.StorageSharedKeyCredential;
import com.azure.storage.common.sas.AccountSasPermission;
import com.azure.storage.common.sas.AccountSasResourceType;
import com.azure.storage.common.sas.AccountSasService;
import com.azure.storage.common.sas.AccountSasSignatureValues;
import com.obapps.core.util.EnvVars;
import com.obapps.schoolchatbot.core.models.EmailAttachment;
import java.time.OffsetDateTime;

/**
 * Service class for handling Azure Storage operations.
 */
public class StorageService {

  /**
   * Cached SAS token for attachments.
   */
  private static String attachmentSasToken = null;

  /**
   * Expiry time for the cached SAS token.
   */
  private static OffsetDateTime attachmentSasTokenExpiry = null;

  /**
   * Environment variables utility.
   */
  private final EnvVars envVars;

  /**
   * Default constructor initializing with default environment variables.
   */
  public StorageService() {
    this(null);
  }

  /**
   * Constructor with custom environment variables.
   *
   * @param envVars Custom environment variables utility.
   */
  public StorageService(EnvVars envVars) {
    this.envVars = envVars == null ? EnvVars.getInstance() : envVars;
  }

  /**
   * Generates a download URL for the given email attachment.
   *
   * @param attachment The email attachment for which the download URL is generated.
   * @return The download URL with a SAS token appended.
   */
  public String getDownloadUrl(EmailAttachment attachment) {
    var accessToken = generateSasToken();
    var cbSeperator = accessToken.startsWith("?") ? "" : "?";
    return attachment.getFilePath() + cbSeperator + accessToken;
  }

  /**
   * Generates a Shared Access Signature (SAS) token for Azure Storage.
   *
   * @return The generated SAS token.
   */
  public String generateSasToken() {
    if (attachmentSasToken != null && attachmentSasTokenExpiry != null) {
      if (OffsetDateTime.now().isBefore(attachmentSasTokenExpiry)) {
        return attachmentSasToken;
      }
    }
    // Generate a new SAS token if the existing one is expired or null

    var env = envVars.getAzureStorage();
    // Create a BlobServiceClient
    BlobServiceClient blobServiceClient = new BlobServiceClientBuilder()
      .connectionString(env.getConnectionString())
      .credential(
        new StorageSharedKeyCredential(
          env.getAccountName(),
          env.getAccountKey()
        )
      )
      .buildClient();

    // Define SAS token permissions and expiration
    OffsetDateTime expiryTime = OffsetDateTime.now().plusDays(1);
    AccountSasPermission accountSasPermission = new AccountSasPermission()
      .setReadPermission(true);
    AccountSasService services = new AccountSasService().setBlobAccess(true);
    AccountSasResourceType resourceTypes = new AccountSasResourceType()
      .setService(true);

    // Generate the account SAS
    AccountSasSignatureValues accountSasValues = new AccountSasSignatureValues(
      expiryTime,
      accountSasPermission,
      services,
      resourceTypes
    );
    // Generate the SAS token
    attachmentSasToken = blobServiceClient.generateAccountSas(accountSasValues);
    // Cache for the next hour
    attachmentSasTokenExpiry = expiryTime;
    return attachmentSasToken;
  }
}
