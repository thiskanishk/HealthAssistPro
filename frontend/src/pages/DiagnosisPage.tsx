
import React, { useState } from "react";
import { Button } from "@mui/material";
import { toast } from "react-toastify";
import { submitDiagnosis } from "../services/diagnosisService";

const DiagnosisPage: React.FC = () => {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDiagnose = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await submitDiagnosis();
      if (!response?.results?.length) {
        throw new Error("No confident diagnoses returned.");
      }
      setResults(response.results);
    } catch (err: any) {
      const msg = err.message || "Diagnosis failed.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4">
      <Button variant="contained" onClick={handleDiagnose} disabled={loading}>
        {loading ? "Diagnosing..." : "Submit for Diagnosis"}
      </Button>

      {error && (
        <div className="mt-4 text-red-600">
          {error}
          <div className="mt-2">
            <Button variant="outlined" onClick={handleDiagnose}>
              Retry
            </Button>
          </div>
        </div>
      )}

      {results.length > 0 && (
        <div className="mt-4">
          <h3>Diagnosis Results:</h3>
          <ul>
            {results.map((r: any, idx: number) => (
              <li key={idx}>
                <strong>{r.condition}</strong> (Confidence: {r.confidence})
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default DiagnosisPage;
