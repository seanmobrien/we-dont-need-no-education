package com.obapps.schoolchatbot.core.services.embed;

import com.obapps.schoolchatbot.core.models.DocumentUnit;
import com.obapps.schoolchatbot.core.models.embed.DocumentUnitEmbeddedProps;
import java.io.IOException;
import java.util.List;

public interface IDocumentStore {
  List<DocumentUnit> readDocumentUnits(Boolean reindex) throws IOException;

  void onDocumentUnitEmbedded(DocumentUnitEmbeddedProps props)
    throws IOException;

  Boolean authenticate() throws IOException;
}
