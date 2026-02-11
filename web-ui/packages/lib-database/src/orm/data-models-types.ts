// Type re-export from data-models to avoid cross-package compilation issues
// This allows the database package to reference data-models types without
// having to include those files in the compilation

export enum EmailPropertyTypeTypeId {
  From = 1,
  To = 2,
  Cc = 3,
  CallToAction = 4,
  CallToActionResponse = 5,
  ComplianceScore = 6,
  ViolationDetails = 7,
  SentimentAnalysis = 8,
  KeyPoints = 9,
  Note = 102,
  ManualReview = 1000,
}
