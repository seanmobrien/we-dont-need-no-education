
DELETE FROM document_unit_analysis_stage_audit WHERE analysis_stage_id=2;

DELETE
	FROM public.document_property where email_property_type_id=4 or email_property_type_id=5;
