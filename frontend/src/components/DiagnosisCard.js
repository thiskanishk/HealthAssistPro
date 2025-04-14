
import React, { Suspense, lazy, memo } from 'react';

const DiagnosisCard = memo(({ condition, confidence, treatment }) => (
  <div className="diagnosis-card">
    <h3>{condition}</h3>
    <p>Confidence: {(confidence * 100).toFixed(1)}%</p>
    <ul>
      {treatment?.map((item, index) => <li key={index}>{item}</li>)}
    </ul>
  </div>
));

export default DiagnosisCard;
