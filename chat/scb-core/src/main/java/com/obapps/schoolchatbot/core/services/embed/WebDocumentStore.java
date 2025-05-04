package com.obapps.schoolchatbot.core.services.embed;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.obapps.core.util.EnvVars;
import com.obapps.schoolchatbot.core.models.DocumentUnit;
import com.obapps.schoolchatbot.core.models.PaginatedResults;
import com.obapps.schoolchatbot.core.models.embed.DocumentUnitEmbeddedProps;
import java.io.IOException;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import okhttp3.*;

public class WebDocumentStore implements IDocumentStore {

  private final OkHttpClient httpClient;
  private String _authCookies;

  public WebDocumentStore() {
    this.httpClient = new OkHttpClient.Builder().followRedirects(false).build();
  }

  @Override
  public List<DocumentUnit> readDocumentUnits(Boolean reindex)
    throws IOException {
    var restApiVars = EnvVars.getInstance().getRestService();
    var request = new Request.Builder()
      .url(
        restApiVars.getServiceUrl(
          "/api/document-unit?limit=1000&offset=0&content=true&pending=true"
        )
      )
      .get()
      .addHeader("Cookie", _authCookies)
      .build();

    try (var response = httpClient.newCall(request).execute()) {
      if (!response.isSuccessful()) {
        throw new IOException("Unexpected code " + response);
      }

      ObjectMapper objectMapper = new ObjectMapper();
      var results = objectMapper.readValue(
        response.body().string(),
        PaginatedResults.class
      );
      if (results == null || results.results == null) {
        throw new IOException("Unexpected result shape");
      }
      return results.results;
    }
  }

  @Override
  public void onDocumentUnitEmbedded(DocumentUnitEmbeddedProps props)
    throws IOException {
    var documentUnit = props.document;
    var embeddingModel = props.embeddingModel;
    var restApiVars = EnvVars.getInstance().getRestService();
    var jsonObject = new com.google.gson.JsonObject();
    jsonObject.addProperty("unitId", documentUnit.unitId);
    jsonObject.addProperty("embeddingModel", embeddingModel);
    jsonObject.addProperty(
      "embeddedOn",
      OffsetDateTime.now().format(DateTimeFormatter.ISO_DATE_TIME)
    );

    var request = new Request.Builder()
      .url(
        restApiVars.getServiceUrl("/api/document-unit/" + documentUnit.unitId)
      )
      .put(
        RequestBody.create(
          jsonObject.toString(),
          MediaType.parse("application/json")
        )
      )
      .addHeader("Cookie", _authCookies)
      .build();

    try (var response = httpClient.newCall(request).execute()) {
      if (!response.isSuccessful()) {
        throw new IOException("Unexpected response code: " + response.code());
      }
    }
  }

  @Override
  public Boolean authenticate() throws IOException {
    var restApiVars = EnvVars.getInstance().getRestService();
    var request = new Request.Builder()
      .url(restApiVars.getServiceUrl("/api/auth/callback/credentials"))
      .post(new FormBody.Builder().build())
      .addHeader(
        restApiVars.getAuthHeaderBypassKey(),
        restApiVars.getAuthHeaderBypassValue()
      )
      .build();

    try (var authResponse = httpClient.newCall(request).execute()) {
      // Step 2: Capture cookies
      Headers headers = authResponse.headers();
      StringBuilder authCookies = new StringBuilder();
      headers
        .values("Set-Cookie")
        .forEach((String setCookie) -> {
          var idxOf = setCookie.indexOf(";");
          if (idxOf > 0) {
            setCookie = setCookie.substring(0, idxOf);
          }
          authCookies.append(setCookie).append("; ");
        });
      if (authCookies.indexOf("authjs.session-token=") == -1) {
        throw new IOException("Login unsuccessful; No session token found.");
      }
      _authCookies = authCookies.substring(0, authCookies.length() - 2);

      return true;
    }
  }
}
