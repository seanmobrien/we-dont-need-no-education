package com.obapps.schoolchatbot.core.models;

import java.util.HashMap;
import java.util.Map;

public class DocumentType {

  // document_type::text = ANY (ARRAY['email'::character varying, 'attachment'::character varying, 'note'::character varying, 'key_point'::character varying, 'cta_response'::character varying, 'cta'::character varying, 'sentiment'::character varying, 'compliance'::character varying]::text[])

  public static class KnownValues {

    public static final String Email = "email";
    public static final String Attachment = "attachment";
    public static final String Note = "note";
    public static final String KeyPoint = "key_point";
    public static final String CtaResponse = "cta_response";
    public static final String Cta = "cta";
    public static final String Sentiment = "sentiment";
    public static final String Compliance = "compliance";
  }

  public static final Map<Integer, String> DocumentPropertyTypes;

  static {
    var map = new HashMap<Integer, String>();
    map.put(2, KnownValues.KeyPoint);
    map.put(4, KnownValues.Cta);
    map.put(5, KnownValues.CtaResponse);
    map.put(9, KnownValues.KeyPoint);
    map.put(102, KnownValues.Note);
    map.put(1000, KnownValues.Note);

    DocumentPropertyTypes = Map.copyOf(map);
  }
}
