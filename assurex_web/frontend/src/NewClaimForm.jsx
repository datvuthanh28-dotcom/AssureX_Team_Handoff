import { useState } from 'react'
import { claimFieldGroups } from './claimFields'
import { api } from './api'

function NewClaimForm() {
  const [claimId, setClaimId] = useState('')
  const [formData, setFormData] = useState({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  function handleChange(field, value) {
    setFormData((current) => ({
      ...current,
      [field.name]:
        field.type === 'number' && value !== ''
          ? Number(value)
          : value,
    }))
  }

  async function handleSubmit(event) {
    event.preventDefault()

    setLoading(true)
    setError('')
    setResult(null)

    try {
      const created = await api('/api/claims', {
        method: 'POST',
        body: JSON.stringify({
          claim_id: claimId,
          input_data: formData,
        }),
      })
      const data = await api(
        `/api/claims/${encodeURIComponent(created.claim_id)}/analyze`,
        { method: 'POST' }
      )
      setResult(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <form className="claim-form" onSubmit={handleSubmit}>
        <section className="form-section">
          <div className="form-section-header">
            <div>
              <p className="eyebrow">Claim Identification</p>
              <h2>Claim Information</h2>
            </div>
          </div>

          <div className="form-grid">
            <label className="form-field">
              <span>Claim ID</span>

              <input
                type="text"
                value={claimId}
                onChange={(event) => setClaimId(event.target.value)}
                placeholder="e.g. CLM01001"
                required
              />
            </label>
          </div>
        </section>

        {claimFieldGroups.map((group) => (
          <section className="form-section" key={group.title}>
            <div className="form-section-header">
              <h3>{group.title}</h3>
            </div>

            <div className="form-grid">
              {group.fields.map((field) => (
                <label className="form-field" key={field.name}>
                  <span>{field.label}</span>

                  {field.type === 'select' ? (
                    <select
                      value={formData[field.name] ?? ''}
                      onChange={(event) =>
                        handleChange(field, event.target.value)
                      }
                      required
                    >
                      <option value="">Select...</option>

                      {field.options.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="number"
                      min={field.min}
                      max={field.max}
                      step={field.step}
                      value={formData[field.name] ?? ''}
                      onChange={(event) =>
                        handleChange(field, event.target.value)
                      }
                      required
                    />
                  )}
                </label>
              ))}
            </div>
          </section>
        ))}

        {error && (
          <div className="form-section">
            <strong>Error:</strong> {error}
          </div>
        )}

        {result && (
          <section className="form-section">
            <p className="eyebrow">Classification Result</p>

            <h2>{result.final_decision}</h2>

            <p>
              ML Prediction: <strong>{result.ml_prediction}</strong>
            </p>

            <p>
              ML Confidence:{' '}
              <strong>
                {(result.ml_confidence * 100).toFixed(2)}%
              </strong>
            </p>

            <p>Rule Triggered: {result.rule_triggered ? 'Yes' : 'No'}</p>
            <p>Decision Reasons: {result.decision_reasons.join(', ') || 'None'}</p>
            <p>Model: {result.model_version}</p>
          </section>
        )}

        <div className="form-actions">
          <button
            type="submit"
            className="primary-button"
            disabled={loading}
          >
            {loading ? 'Classifying...' : 'Classify Claim'}
          </button>
        </div>
      </form>
    </>
  )
}

export default NewClaimForm
