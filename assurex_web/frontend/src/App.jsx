import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { api } from './api'
import { claimFieldGroups } from './claimFields'


const MODEL_METRICS = {
  pythonAccuracy: '95.56%',
  pythonF1: '95.59%',
  pythonConfidence: '93.20%',
  gtmAccuracy: '81.33%',
  gtmF1: '81.29%',
  gtmConfidence: '87.74%',
}


function formatDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleString()
}


function formatNumber(value) {
  if (value === null || value === undefined) return '—'

  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 2,
  }).format(value)
}


function StatusBadge({ value }) {
  const normalized = String(value || '')
    .toLowerCase()
    .replaceAll(' ', '-')

  return (
    <span className={`status-badge status-${normalized}`}>
      {value || 'Unknown'}
    </span>
  )
}


function LoadingState() {
  return (
    <div className="state-card">
      <div className="spinner" />
      <span>Loading data...</span>
    </div>
  )
}


function EmptyState({ title, description }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">◇</div>
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  )
}


function PageHeader({
  eyebrow,
  title,
  description,
  action,
}) {
  return (
    <header className="page-header">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        {description && (
          <p className="page-description">
            {description}
          </p>
        )}
      </div>

      {action}
    </header>
  )
}


function StatCard({
  label,
  value,
  hint,
  tone = 'default',
}) {
  return (
    <article className={`stat-card tone-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{hint}</small>
    </article>
  )
}


function AdminDashboard({
  onNavigate,
  refreshKey,
}) {
  const [mlClaims, setMlClaims] = useState([])
  const [customerClaims, setCustomerClaims] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api('/api/claims'),
      api('/api/customer/claims'),
    ])
      .then(([ml, customer]) => {
        setMlClaims(ml)
        setCustomerClaims(customer)
      })
      .finally(() => setLoading(false))
  }, [refreshKey])

  const review = customerClaims.filter(
    (claim) => claim.status === 'Under Review'
  ).length

  const approved = customerClaims.filter(
    (claim) => claim.status === 'Approved'
  ).length

  const rejected = customerClaims.filter(
    (claim) => claim.status === 'Rejected'
  ).length

  return (
    <>
      <PageHeader
        eyebrow="Operations overview"
        title="Admin Dashboard"
        description="Monitor incoming warranty claims, ML classifications and model performance."
        action={
          <button
            className="button primary"
            onClick={() => onNavigate('classify')}
          >
            + New Classification
          </button>
        }
      />

      <section className="hero-card">
        <div>
          <p className="eyebrow">
            Primary ML Model
          </p>

          <h2>Python Gradient Boosting</h2>

          <p>
            Final production classification model selected
            using Macro F1 on the locked 225-claim test set.
          </p>

          <div className="hero-actions">
            <button
              className="button secondary"
              onClick={() => onNavigate('model')}
            >
              View Model Intelligence
            </button>
          </div>
        </div>

        <div className="metric-highlight">
          <span>Test Accuracy</span>
          <strong>
            {MODEL_METRICS.pythonAccuracy}
          </strong>
          <small>SRS requirement passed</small>
        </div>
      </section>

      {loading ? (
        <LoadingState />
      ) : (
        <>
          <section className="stats-grid">
            <StatCard
              label="Customer Claims"
              value={customerClaims.length}
              hint="Total submitted"
            />

            <StatCard
              label="Under Review"
              value={review}
              hint="Requires staff attention"
              tone="warning"
            />

            <StatCard
              label="Approved"
              value={approved}
              hint="Approved customer claims"
              tone="success"
            />

            <StatCard
              label="Rejected"
              value={rejected}
              hint="Rejected customer claims"
              tone="danger"
            />
          </section>

          <section className="dashboard-grid">
            <article className="panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">
                    Customer Queue
                  </p>
                  <h2>Recent Claims</h2>
                </div>

                <button
                  className="text-button"
                  onClick={() =>
                    onNavigate('customer-claims')
                  }
                >
                  View all →
                </button>
              </div>

              {customerClaims.length === 0 ? (
                <EmptyState
                  title="No customer claims yet"
                  description="Submitted customer claims will appear here."
                />
              ) : (
                <div className="compact-list">
                  {customerClaims
                    .slice(0, 5)
                    .map((claim) => (
                      <div
                        className="compact-row"
                        key={claim.id}
                      >
                        <div>
                          <strong>
                            {claim.claim_id}
                          </strong>
                          <span>
                            {claim.customer_name}
                            {' · '}
                            {claim.product_name}
                          </span>
                        </div>

                        <StatusBadge
                          value={claim.status}
                        />
                      </div>
                    ))}
                </div>
              )}
            </article>

            <article className="panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">
                    Classification Engine
                  </p>
                  <h2>ML Activity</h2>
                </div>
              </div>

              <div className="model-summary">
                <div>
                  <span>Stored classifications</span>
                  <strong>{mlClaims.length}</strong>
                </div>

                <div>
                  <span>Macro F1</span>
                  <strong>
                    {MODEL_METRICS.pythonF1}
                  </strong>
                </div>

                <div>
                  <span>Mean confidence</span>
                  <strong>
                    {MODEL_METRICS.pythonConfidence}
                  </strong>
                </div>
              </div>
            </article>
          </section>
        </>
      )}
    </>
  )
}


function AdminCustomerClaims({
  refreshKey,
  onChanged,
}) {
  const [claims, setClaims] = useState([])
  const [selected, setSelected] = useState(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] =
    useState('All')
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)

  function loadClaims() {
    setLoading(true)

    api('/api/customer/claims')
      .then((data) => {
        setClaims(data)

        if (selected) {
          const fresh = data.find(
            (claim) =>
              claim.claim_id === selected.claim_id
          )

          if (fresh) setSelected(fresh)
        }
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadClaims()
  }, [refreshKey])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()

    return claims.filter((claim) => {
      const matchesSearch =
        !term ||
        [
          claim.claim_id,
          claim.customer_name,
          claim.email,
          claim.product_name,
          claim.serial_number,
        ].some((value) =>
          String(value || '')
            .toLowerCase()
            .includes(term)
        )

      const matchesStatus =
        statusFilter === 'All' ||
        claim.status === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [claims, search, statusFilter])

  async function updateStatus(status) {
    if (!selected) return

    setUpdating(true)

    try {
      const updated = await api(
        `/api/customer/claims/${selected.claim_id}/status`,
        {
          method: 'PATCH',
          body: JSON.stringify({ status }),
        }
      )

      setSelected(updated)

      setClaims((current) =>
        current.map((claim) =>
          claim.claim_id === updated.claim_id
            ? updated
            : claim
        )
      )

      onChanged()
    } finally {
      setUpdating(false)
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Customer operations"
        title="Customer Claims"
        description="Review, search and update submitted warranty claims."
      />

      <section className="panel">
        <div className="toolbar">
          <div className="search-box">
            <span>⌕</span>
            <input
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search Claim ID, customer, product..."
            />
          </div>

          <select
            className="filter-select"
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value)
            }
          >
            <option>All</option>
            <option>Under Review</option>
            <option>Approved</option>
            <option>Rejected</option>
          </select>

          <span className="results-count">
            {filtered.length} claim(s)
          </span>
        </div>

        {loading ? (
          <LoadingState />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No matching claims"
            description="Try changing the search or status filter."
          />
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Claim ID</th>
                  <th>Customer</th>
                  <th>Product</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Submitted</th>
                </tr>
              </thead>

              <tbody>
                {filtered.map((claim) => (
                  <tr
                    key={claim.id}
                    className={
                      selected?.id === claim.id
                        ? 'selected-row'
                        : ''
                    }
                    onClick={() =>
                      setSelected(claim)
                    }
                  >
                    <td className="mono">
                      {claim.claim_id}
                    </td>
                    <td>
                      <strong>
                        {claim.customer_name}
                      </strong>
                      <small>
                        {claim.email}
                      </small>
                    </td>
                    <td>{claim.product_name}</td>
                    <td>
                      {formatNumber(
                        claim.claim_amount
                      )}
                    </td>
                    <td>
                      <StatusBadge
                        value={claim.status}
                      />
                    </td>
                    <td>
                      {formatDate(
                        claim.created_at
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selected && (
        <section className="panel detail-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">
                Claim Detail
              </p>
              <h2>{selected.claim_id}</h2>
            </div>

            <StatusBadge value={selected.status} />
          </div>

          <div className="detail-grid">
            <div>
              <span>Customer</span>
              <strong>
                {selected.customer_name}
              </strong>
            </div>

            <div>
              <span>Email</span>
              <strong>{selected.email}</strong>
            </div>

            <div>
              <span>Product</span>
              <strong>
                {selected.product_name}
              </strong>
            </div>

            <div>
              <span>Serial Number</span>
              <strong>
                {selected.serial_number}
              </strong>
            </div>

            <div>
              <span>Purchase Date</span>
              <strong>
                {selected.purchase_date}
              </strong>
            </div>

            <div>
              <span>Claim Amount</span>
              <strong>
                {formatNumber(
                  selected.claim_amount
                )}
              </strong>
            </div>
          </div>

          <div className="description-box">
            <span>Customer Description</span>
            <p>{selected.fault_description}</p>
          </div>

          <div className="decision-actions">
            <span>Update claim status</span>

            <div>
              <button
                className="button warning"
                disabled={updating}
                onClick={() =>
                  updateStatus('Under Review')
                }
              >
                Under Review
              </button>

              <button
                className="button success"
                disabled={updating}
                onClick={() =>
                  updateStatus('Approved')
                }
              >
                Approve
              </button>

              <button
                className="button danger"
                disabled={updating}
                onClick={() =>
                  updateStatus('Rejected')
                }
              >
                Reject
              </button>
            </div>
          </div>
        </section>
      )}
    </>
  )
}


function MLClassification({ onCreated }) {
  const [claimId, setClaimId] = useState('')
  const [formData, setFormData] = useState({})
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function changeField(field, value) {
    setFormData((current) => ({
      ...current,
      [field.name]:
        field.type === 'number' && value !== ''
          ? Number(value)
          : value,
    }))
  }

  async function submit(event) {
    event.preventDefault()

    setLoading(true)
    setError('')
    setResult(null)

    try {
      const data = await api(
        '/api/claims/predict',
        {
          method: 'POST',
          body: JSON.stringify({
            claim_id: claimId,
            input_data: formData,
          }),
        }
      )

      setResult(data)
      onCreated()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="ML classification"
        title="New Classification"
        description="Create a structured claim and run the production Gradient Boosting model."
      />

      <form
        className="claim-form"
        onSubmit={submit}
      >
        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">
                Identification
              </p>
              <h2>Claim Information</h2>
            </div>
          </div>

          <div className="form-grid">
            <label className="form-field">
              <span>Claim ID</span>
              <input
                value={claimId}
                onChange={(event) =>
                  setClaimId(event.target.value)
                }
                placeholder="e.g. CLM01001"
                required
              />
            </label>
          </div>
        </section>

        {claimFieldGroups.map((group) => (
          <section
            className="panel"
            key={group.title}
          >
            <div className="panel-heading">
              <h3>{group.title}</h3>
            </div>

            <div className="form-grid">
              {group.fields.map((field) => (
                <label
                  className="form-field"
                  key={field.name}
                >
                  <span>{field.label}</span>

                  {field.type === 'select' ? (
                    <select
                      value={
                        formData[field.name] ?? ''
                      }
                      onChange={(event) =>
                        changeField(
                          field,
                          event.target.value
                        )
                      }
                      required
                    >
                      <option value="">
                        Select...
                      </option>

                      {field.options.map(
                        (option) => (
                          <option
                            key={option}
                            value={option}
                          >
                            {option}
                          </option>
                        )
                      )}
                    </select>
                  ) : (
                    <input
                      type="number"
                      min={field.min}
                      max={field.max}
                      step={field.step}
                      value={
                        formData[field.name] ?? ''
                      }
                      onChange={(event) =>
                        changeField(
                          field,
                          event.target.value
                        )
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
          <div className="alert error">
            {error}
          </div>
        )}

        {result && (
          <section className="result-card">
            <div>
              <p className="eyebrow">
                Classification Result
              </p>

              <h2>{result.predicted_class}</h2>

              <p>
                Confidence:{' '}
                <strong>
                  {(result.confidence * 100)
                    .toFixed(2)}
                  %
                </strong>
              </p>
            </div>

            <div className="probability-list">
              {Object.entries(
                result.probabilities
              ).map(([label, probability]) => (
                <div
                  className="probability-row"
                  key={label}
                >
                  <div>
                    <span>{label}</span>
                    <strong>
                      {(probability * 100)
                        .toFixed(2)}
                      %
                    </strong>
                  </div>

                  <div className="progress-track">
                    <div
                      className="progress-value"
                      style={{
                        width: `${probability * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="form-actions">
          <button
            className="button primary large"
            disabled={loading}
          >
            {loading
              ? 'Classifying...'
              : 'Classify Claim'}
          </button>
        </div>
      </form>
    </>
  )
}


function MLHistory({ refreshKey }) {
  const [claims, setClaims] = useState([])
  const [selected, setSelected] = useState(null)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api('/api/claims')
      .then(setClaims)
      .finally(() => setLoading(false))
  }, [refreshKey])

  const filtered = claims.filter((claim) =>
    claim.claim_id
      .toLowerCase()
      .includes(search.toLowerCase())
  )

  async function openClaim(claimId) {
    const detail = await api(
      `/api/claims/${claimId}`
    )

    setSelected(detail)
  }

  return (
    <>
      <PageHeader
        eyebrow="ML audit trail"
        title="Classification History"
        description="Review stored production model predictions and their original feature values."
      />

      <section className="panel">
        <div className="toolbar">
          <div className="search-box">
            <span>⌕</span>
            <input
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search Claim ID..."
            />
          </div>
        </div>

        {loading ? (
          <LoadingState />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No classifications found"
            description="Create a classification to see it here."
          />
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Claim ID</th>
                  <th>Prediction</th>
                  <th>Confidence</th>
                  <th>Model</th>
                  <th>Created</th>
                </tr>
              </thead>

              <tbody>
                {filtered.map((claim) => (
                  <tr
                    key={claim.id}
                    onClick={() =>
                      openClaim(claim.claim_id)
                    }
                  >
                    <td className="mono">
                      {claim.claim_id}
                    </td>
                    <td>
                      <StatusBadge
                        value={
                          claim.predicted_class
                        }
                      />
                    </td>
                    <td>
                      {(claim.confidence * 100)
                        .toFixed(2)}
                      %
                    </td>
                    <td>{claim.model_name}</td>
                    <td>
                      {formatDate(
                        claim.created_at
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selected && (
        <section className="panel detail-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">
                Classification Detail
              </p>
              <h2>{selected.claim_id}</h2>
            </div>

            <StatusBadge
              value={selected.predicted_class}
            />
          </div>

          <div className="detail-grid">
            <div>
              <span>Prediction</span>
              <strong>
                {selected.predicted_class}
              </strong>
            </div>

            <div>
              <span>Confidence</span>
              <strong>
                {(selected.confidence * 100)
                  .toFixed(2)}
                %
              </strong>
            </div>

            <div>
              <span>Model</span>
              <strong>
                {selected.model_name}
              </strong>
            </div>

            <div>
              <span>Created</span>
              <strong>
                {formatDate(selected.created_at)}
              </strong>
            </div>
          </div>

          <div className="feature-grid">
            {Object.entries(
              selected.input_data || {}
            ).map(([key, value]) => (
              <div key={key}>
                <span>{key}</span>
                <strong>{String(value)}</strong>
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  )
}


function ModelInfo() {
  return (
    <>
      <PageHeader
        eyebrow="Model intelligence"
        title="Model Performance"
        description="Final locked-test comparison between the structured Python model and GTM G5."
      />

      <section className="hero-card">
        <div>
          <p className="eyebrow">
            Final Selection
          </p>
          <h2>Python Gradient Boosting</h2>
          <p>
            Selected as the production primary model
            using Macro F1 as the pre-defined selection
            metric.
          </p>
        </div>

        <div className="metric-highlight">
          <span>Macro F1</span>
          <strong>
            {MODEL_METRICS.pythonF1}
          </strong>
          <small>Primary model</small>
        </div>
      </section>

      <section className="stats-grid">
        <StatCard
          label="Python Accuracy"
          value={MODEL_METRICS.pythonAccuracy}
          hint="215 / 225 correct"
          tone="success"
        />

        <StatCard
          label="Python Macro F1"
          value={MODEL_METRICS.pythonF1}
          hint="Primary selection metric"
        />

        <StatCard
          label="Mean Confidence"
          value={MODEL_METRICS.pythonConfidence}
          hint="Python final test"
        />

        <StatCard
          label="Test Errors"
          value="10"
          hint="Across 225 claims"
        />
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">
              Final Comparison
            </p>
            <h2>Python vs GTM G5</h2>
          </div>
        </div>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Metric</th>
                <th>Python</th>
                <th>GTM G5</th>
              </tr>
            </thead>

            <tbody>
              <tr>
                <td>Accuracy</td>
                <td>
                  {MODEL_METRICS.pythonAccuracy}
                </td>
                <td>
                  {MODEL_METRICS.gtmAccuracy}
                </td>
              </tr>

              <tr>
                <td>Macro F1</td>
                <td>
                  {MODEL_METRICS.pythonF1}
                </td>
                <td>{MODEL_METRICS.gtmF1}</td>
              </tr>

              <tr>
                <td>Mean Confidence</td>
                <td>
                  {
                    MODEL_METRICS.pythonConfidence
                  }
                </td>
                <td>
                  {MODEL_METRICS.gtmConfidence}
                </td>
              </tr>

              <tr>
                <td>Total Errors</td>
                <td>10</td>
                <td>42</td>
              </tr>

              <tr>
                <td>SRS ≥ 85%</td>
                <td>
                  <StatusBadge value="PASS" />
                </td>
                <td>
                  <StatusBadge value="FAIL" />
                </td>
              </tr>

              <tr>
                <td>Role</td>
                <td>Primary Model</td>
                <td>Secondary Model</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">
              GTM Feature Selection
            </p>
            <h2>G5 Ablation Summary</h2>
          </div>
        </div>

        <div className="split-info">
          <div>
            <span>Removed</span>
            <strong>
              DamageType, ExtendedWarranty,
              WarrantyDurationMonths
            </strong>
          </div>

          <div>
            <span>Removal rolled back</span>
            <strong>
              Brand, ClaimSubmissionChannel,
              ReceiptAvailable, PriorClaimCount
            </strong>
          </div>
        </div>
      </section>
    </>
  )
}


function CustomerIdentity({
  email,
  onChange,
}) {
  return (
    <div className="customer-identity">
      <div>
        <span>Customer account</span>
        <strong>
          {email || 'Enter your email'}
        </strong>
      </div>

      <input
        type="email"
        value={email}
        onChange={(event) =>
          onChange(event.target.value)
        }
        placeholder="your@email.com"
      />
    </div>
  )
}


function CustomerHome({
  email,
  setEmail,
  onNavigate,
  refreshKey,
}) {
  const [claims, setClaims] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!email) {
      setClaims([])
      return
    }

    setLoading(true)

    api(
      `/api/customer/claims?email=${encodeURIComponent(
        email
      )}`
    )
      .then(setClaims)
      .finally(() => setLoading(false))
  }, [email, refreshKey])

  const review = claims.filter(
    (claim) => claim.status === 'Under Review'
  ).length

  const approved = claims.filter(
    (claim) => claim.status === 'Approved'
  ).length

  const rejected = claims.filter(
    (claim) => claim.status === 'Rejected'
  ).length

  return (
    <>
      <PageHeader
        eyebrow="AssureX Customer Portal"
        title="Warranty Claims"
        description="Submit warranty claims and track their progress."
        action={
          <button
            className="button primary"
            onClick={() => onNavigate('submit')}
          >
            + Submit Claim
          </button>
        }
      />

      <CustomerIdentity
        email={email}
        onChange={setEmail}
      />

      <section className="customer-hero">
        <div>
          <p className="eyebrow">
            Customer Warranty Service
          </p>
          <h2>
            Everything about your claim in one place.
          </h2>
          <p>
            Submit a warranty request, receive a claim ID,
            and follow the review status from submission to
            final decision.
          </p>
        </div>

        <button
          className="button primary large"
          onClick={() => onNavigate('submit')}
        >
          Submit Warranty Claim
        </button>
      </section>

      {loading ? (
        <LoadingState />
      ) : (
        <>
          <section className="stats-grid">
            <StatCard
              label="My Claims"
              value={claims.length}
              hint="Total submitted"
            />

            <StatCard
              label="Under Review"
              value={review}
              hint="Currently being reviewed"
              tone="warning"
            />

            <StatCard
              label="Approved"
              value={approved}
              hint="Approved warranty claims"
              tone="success"
            />

            <StatCard
              label="Rejected"
              value={rejected}
              hint="Rejected claims"
              tone="danger"
            />
          </section>

          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">
                  Recent Activity
                </p>
                <h2>My Recent Claims</h2>
              </div>

              <button
                className="text-button"
                onClick={() =>
                  onNavigate('my-claims')
                }
              >
                View all →
              </button>
            </div>

            {!email ? (
              <EmptyState
                title="Enter your email"
                description="Use the email associated with your submitted warranty claims."
              />
            ) : claims.length === 0 ? (
              <EmptyState
                title="No claims found"
                description="Submit your first warranty claim to get started."
              />
            ) : (
              <div className="compact-list">
                {claims.slice(0, 5).map((claim) => (
                  <div
                    className="compact-row"
                    key={claim.id}
                  >
                    <div>
                      <strong>
                        {claim.claim_id}
                      </strong>
                      <span>
                        {claim.product_name}
                        {' · '}
                        {formatDate(
                          claim.created_at
                        )}
                      </span>
                    </div>

                    <StatusBadge
                      value={claim.status}
                    />
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </>
  )
}


function CustomerSubmit({
  email,
  setEmail,
  onSubmitted,
  onNavigate,
}) {
  const [form, setForm] = useState({
    customer_name: '',
    email: email || '',

    product_name: '',
    model_number: '',
    serial_number: '',
    purchase_date: '',
    warranty_duration_months: '',

    fault_date: '',
    damage_type: '',
    claim_amount: '',
    fault_description: '',

    receipt_available: '',
    product_image_available: '',
    fault_evidence_available: '',

    previous_repair: 'No',
    repair_count: '0',
    repair_report_available: '',
    repair_authorized: '',
  })

  const [submitting, setSubmitting] =
    useState(false)

  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  const [
    warrantyDocument,
    setWarrantyDocument,
  ] = useState(null)

  const [
    ocrOriginal,
    setOcrOriginal,
  ] = useState(null)

  const [
    ocrUploading,
    setOcrUploading,
  ] = useState(false)

  const [
    ocrError,
    setOcrError,
  ] = useState('')

  function change(event) {
    const { name, value } = event.target

    setForm((current) => ({
      ...current,
      [name]: value,
    }))
  }

  async function uploadWarranty(event) {
    const file =
      event.target.files?.[0]

    if (!file) return

    setOcrUploading(true)
    setOcrError('')

    try {
      const body = new FormData()

      body.append(
        'file',
        file
      )

      const data = await api(
        '/api/customer/warranty/extract',
        {
          method: 'POST',
          body,
        }
      )

      const extracted =
        data.extracted_data || {}

      setOcrOriginal(extracted)

      setWarrantyDocument({
        document_id:
          data.document_id,

        filename:
          data.filename,

        ocr_confidence:
          data.ocr_confidence,
      })

      setForm((current) => ({
        ...current,

        customer_name:
          extracted.customer_name ||
          current.customer_name,

        email:
          extracted.email ||
          current.email,

        product_name:
          extracted.product_name ||
          current.product_name,

        model_number:
          extracted.model_number ||
          current.model_number,

        serial_number:
          extracted.serial_number ||
          current.serial_number,

        purchase_date:
          extracted.purchase_date ||
          current.purchase_date,

        warranty_duration_months:
          extracted.warranty_duration_months
            ? String(
                extracted
                  .warranty_duration_months
              )
            : current
                .warranty_duration_months,
      }))
    } catch (err) {
      setOcrError(err.message)
    } finally {
      setOcrUploading(false)
    }
  }

  function normalizeCompare(value) {
    return String(
      value ?? ''
    )
      .trim()
      .toLowerCase()
  }

  function changedFromWarranty(field) {
    if (!ocrOriginal) {
      return false
    }

    const original =
      ocrOriginal[field]

    if (
      original === null ||
      original === undefined ||
      original === ''
    ) {
      return false
    }

    return (
      normalizeCompare(original) !==
      normalizeCompare(form[field])
    )
  }

  async function submit(event) {
    event.preventDefault()

    setSubmitting(true)
    setError('')
    setResult(null)

    try {
      const previousRepair =
        form.previous_repair

      const payload = {
        customer_name:
          form.customer_name,

        email:
          form.email,

        product_name:
          form.product_name,

        model_number:
          form.model_number,

        serial_number:
          form.serial_number,

        purchase_date:
          form.purchase_date,

        fault_date:
          form.fault_date || null,

        damage_type:
          form.damage_type,

        claim_amount:
          form.claim_amount
            ? Number(form.claim_amount)
            : null,

        fault_description:
          form.fault_description,

        warranty_duration_months:
          form.warranty_duration_months
            ? Number(
                form.warranty_duration_months
              )
            : null,

        extended_warranty:
          'No',

        receipt_available:
          form.receipt_available,

        warranty_card_available:
          warrantyDocument
            ? 'Yes'
            : 'No',

        product_image_available:
          form.product_image_available,

        serial_evidence_available:
          ocrOriginal?.serial_number
            ? 'Yes'
            : 'No',

        fault_evidence_available:
          form.fault_evidence_available,

        evidence_serial_number:
          ocrOriginal?.serial_number ||
          null,

        evidence_model_number:
          ocrOriginal?.model_number ||
          null,

        previous_repair:
          previousRepair,

        repair_count:
          previousRepair === 'Yes'
            ? Number(
                form.repair_count || 0
              )
            : 0,

        repair_report_available:
          previousRepair === 'Yes'
            ? form
                .repair_report_available
            : 'Not Applicable',

        repair_authorized:
          previousRepair === 'Yes'
            ? form.repair_authorized
            : 'Not Applicable',

        ocr_confidence:
          warrantyDocument
            ?.ocr_confidence ??
          null,

        document_duplicate_indicator:
          'No',

        warranty_document_id:
          warrantyDocument
            ?.document_id ||
          null,

        warranty_ocr_data:
          ocrOriginal,

        warranty_ocr_confidence:
          warrantyDocument
            ?.ocr_confidence ??
          null,
      }

      const data = await api(
        '/api/customer/claims',
        {
          method: 'POST',
          body: JSON.stringify(
            payload
          ),
        }
      )

      setResult(data)
      setEmail(form.email)
      onSubmitted()
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  function decisionMessage() {
    if (!result) return ''

    if (result.status === 'Approved') {
      return (
        'Your claim passed the automated ' +
        'warranty assessment and has been approved.'
      )
    }

    if (result.status === 'Rejected') {
      return (
        'The automated assessment identified ' +
        'one or more conditions that make this ' +
        'claim ineligible.'
      )
    }

    return (
      'Your claim requires additional review. ' +
      'It has been sent to the warranty team.'
    )
  }

  if (result) {
    const decision = result.decision

    return (
      <>
        <PageHeader
          eyebrow="Claim submitted"
          title="Submission Complete"
          description="Your warranty claim has been evaluated and recorded."
        />

        <section className="success-card decision-success-card">
          <div
            className={`decision-mark ${
              result.status === 'Approved'
                ? 'approved'
                : result.status === 'Rejected'
                  ? 'rejected'
                  : 'review'
            }`}
          >
            {result.status === 'Approved'
              ? '✓'
              : result.status === 'Rejected'
                ? '×'
                : '…'}
          </div>

          <p className="eyebrow">
            Claim ID
          </p>

          <h2>{result.claim_id}</h2>

          <StatusBadge
            value={result.status}
          />

          <p className="decision-message">
            {decisionMessage()}
          </p>

          {decision && (
            <div className="decision-summary-grid">
              <div>
                <span>
                  AI Classification
                </span>

                <strong>
                  {decision.final_decision}
                </strong>
              </div>

              <div>
                <span>Confidence</span>

                <strong>
                  {(
                    decision.ml_confidence *
                    100
                  ).toFixed(2)}
                  %
                </strong>
              </div>

              <div>
                <span>Processing</span>

                <strong>
                  {
                    decision
                      .requires_admin_review
                      ? 'Manual Review'
                      : 'Automatic'
                  }
                </strong>
              </div>
            </div>
          )}

          {decision
            ?.decision_reasons
            ?.length > 0 && (
            <div className="decision-reasons">
              <span>
                Assessment notes
              </span>

              <ul>
                {
                  decision
                    .decision_reasons
                    .map((reason) => (
                      <li key={reason}>
                        {reason}
                      </li>
                    ))
                }
              </ul>
            </div>
          )}

          <div className="success-actions">
            <button
              className="button primary"
              onClick={() =>
                onNavigate('my-claims')
              }
            >
              View My Claims
            </button>

            <button
              className="button secondary"
              onClick={() =>
                onNavigate('home')
              }
            >
              Customer Home
            </button>
          </div>
        </section>
      </>
    )
  }

  const yesNoOptions = [
    'Yes',
    'No',
  ]

  return (
    <>
      <PageHeader
        eyebrow="AssureX Customer Portal"
        title="Submit a Warranty Claim"
        description="Upload your warranty card and provide only the information needed to assess your claim."
      />

      <form
        className="claim-form"
        onSubmit={submit}
      >
        <section className="panel warranty-upload-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">
                Start here
              </p>

              <h2>
                Upload Warranty Card
              </h2>

              <p className="section-helper">
                Upload a clear photo. AssureX
                will read the warranty details
                and fill the form automatically.
              </p>
            </div>
          </div>

          <label className="warranty-upload-box">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={uploadWarranty}
              disabled={ocrUploading}
            />

            <strong>
              {ocrUploading
                ? 'Reading warranty card...'
                : 'Choose Warranty Card'}
            </strong>

            <span>
              JPG, PNG or WEBP · Max 8 MB
            </span>
          </label>

          {ocrError && (
            <div className="alert error">
              {ocrError}
            </div>
          )}

          {warrantyDocument && (
            <>
              <div className="ocr-success">
                <div>
                  <strong>
                    ✓ Warranty card processed
                  </strong>

                  <span>
                    {
                      warrantyDocument
                        .filename
                    }
                  </span>
                </div>

                <div>
                  OCR confidence:{' '}
                  {(
                    warrantyDocument
                      .ocr_confidence *
                    100
                  ).toFixed(1)}
                  %
                </div>
              </div>

              {ocrOriginal && (
                <details
                  className="evidence-verification"
                  style={{
                    marginTop: '16px',
                  }}
                >
                  <summary
                    style={{
                      cursor: 'pointer',
                      fontWeight: 700,
                    }}
                  >
                    View extracted warranty
                    information
                  </summary>

                  <div
                    className="detail-grid"
                    style={{
                      marginTop: '16px',
                    }}
                  >
                    <div>
                      <span>
                        Warranty Number
                      </span>
                      <strong>
                        {
                          ocrOriginal
                            .warranty_number ||
                          '—'
                        }
                      </strong>
                    </div>

                    <div>
                      <span>
                        Customer
                      </span>
                      <strong>
                        {
                          ocrOriginal
                            .customer_name ||
                          '—'
                        }
                      </strong>
                    </div>

                    <div>
                      <span>Phone</span>
                      <strong>
                        {
                          ocrOriginal
                            .phone_number ||
                          '—'
                        }
                      </strong>
                    </div>

                    <div>
                      <span>Email</span>
                      <strong>
                        {
                          ocrOriginal
                            .email ||
                          '—'
                        }
                      </strong>
                    </div>

                    <div>
                      <span>Product</span>
                      <strong>
                        {
                          ocrOriginal
                            .product_name ||
                          '—'
                        }
                      </strong>
                    </div>

                    <div>
                      <span>Model</span>
                      <strong>
                        {
                          ocrOriginal
                            .model_number ||
                          '—'
                        }
                      </strong>
                    </div>

                    <div>
                      <span>
                        Serial Number
                      </span>
                      <strong>
                        {
                          ocrOriginal
                            .serial_number ||
                          '—'
                        }
                      </strong>
                    </div>

                    <div>
                      <span>
                        Purchase Date
                      </span>
                      <strong>
                        {
                          ocrOriginal
                            .purchase_date ||
                          '—'
                        }
                      </strong>
                    </div>

                    <div>
                      <span>
                        Warranty Duration
                      </span>
                      <strong>
                        {
                          ocrOriginal
                            .warranty_duration_months
                            ? `${
                                ocrOriginal
                                  .warranty_duration_months
                              } months`
                            : '—'
                        }
                      </strong>
                    </div>

                    <div>
                      <span>Dealer</span>
                      <strong>
                        {
                          ocrOriginal
                            .dealer_name ||
                          '—'
                        }
                      </strong>
                    </div>

                    <div>
                      <span>
                        Dealer Address
                      </span>
                      <strong>
                        {
                          ocrOriginal
                            .dealer_address ||
                          '—'
                        }
                      </strong>
                    </div>

                    <div>
                      <span>
                        Warranty Status
                      </span>
                      <strong>
                        {
                          ocrOriginal
                            .warranty_status ||
                          '—'
                        }
                      </strong>
                    </div>
                  </div>
                </details>
              )}
            </>
          )}
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">
                Step 1
              </p>

              <h2>
                Contact & Warranty
              </h2>

              <p className="section-helper">
                Review the information extracted
                from your warranty card and
                correct it only if necessary.
              </p>
            </div>
          </div>

          <div className="form-grid">
            <label className="form-field">
              <span>Full Name</span>

              <input
                name="customer_name"
                value={
                  form.customer_name
                }
                onChange={change}
                placeholder="Your full name"
                required
              />
            </label>

            <label className="form-field">
              <span>Email Address</span>

              <input
                type="email"
                name="email"
                value={form.email}
                onChange={change}
                placeholder="you@example.com"
                required
              />
            </label>

            <label className="form-field">
              <span>Product Name</span>

              <input
                name="product_name"
                value={
                  form.product_name
                }
                onChange={change}
                placeholder="Product name"
                required
              />
            </label>

            <label className="form-field">
              <span>Model Number</span>

              <input
                name="model_number"
                value={
                  form.model_number
                }
                onChange={change}
                placeholder="Model number"
                required
              />

              {changedFromWarranty(
                'model_number'
              ) && (
                <span className="ocr-mismatch">
                  ⚠ Different from the
                  warranty card
                </span>
              )}
            </label>

            <label className="form-field">
              <span>Serial Number</span>

              <input
                name="serial_number"
                value={
                  form.serial_number
                }
                onChange={change}
                placeholder="Serial number"
                required
              />

              {changedFromWarranty(
                'serial_number'
              ) && (
                <span className="ocr-mismatch">
                  ⚠ Different from the
                  warranty card
                </span>
              )}
            </label>

            <label className="form-field">
              <span>Purchase Date</span>

              <input
                type="date"
                name="purchase_date"
                value={
                  form.purchase_date
                }
                onChange={change}
                required
              />

              {changedFromWarranty(
                'purchase_date'
              ) && (
                <span className="ocr-mismatch">
                  ⚠ Different from the
                  warranty card
                </span>
              )}
            </label>

            <label className="form-field">
              <span>
                Warranty Duration
              </span>

              <select
                name="warranty_duration_months"
                value={
                  form
                    .warranty_duration_months
                }
                onChange={change}
                required
              >
                <option value="">
                  Select...
                </option>

                <option value="6">
                  6 months
                </option>

                <option value="12">
                  12 months
                </option>

                <option value="18">
                  18 months
                </option>

                <option value="24">
                  24 months
                </option>

                <option value="36">
                  36 months
                </option>
              </select>

              {changedFromWarranty(
                'warranty_duration_months'
              ) && (
                <span className="ocr-mismatch">
                  ⚠ Different from the
                  warranty card
                </span>
              )}
            </label>
          </div>
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">
                Step 2
              </p>

              <h2>
                What Happened?
              </h2>

              <p className="section-helper">
                Tell us about the fault or
                problem with the product.
              </p>
            </div>
          </div>

          <div className="form-grid">
            <label className="form-field">
              <span>
                When did you first notice the issue?
                <small> Optional</small>
              </span>

              <input
                type="date"
                name="fault_date"
                value={form.fault_date}
                onChange={change}
              />
            </label>

            <label className="form-field">
              <span>
                Damage / Fault Type
              </span>

              <select
                name="damage_type"
                value={
                  form.damage_type
                }
                onChange={change}
                required
              >
                <option value="">
                  Select fault type...
                </option>

                <optgroup label="Product Fault">
                  <option>
                    Manufacturing Defect
                  </option>

                  <option>
                    Electrical Failure
                  </option>

                  <option>
                    Internal Component Failure
                  </option>
                </optgroup>

                <optgroup label="Other Damage">
                  <option>
                    Accidental Damage
                  </option>

                  <option>
                    Water Damage
                  </option>

                  <option>
                    Physical Damage
                  </option>

                  <option>
                    Normal Wear
                  </option>

                  <option>
                    Misuse
                  </option>
                </optgroup>

                <option>
                  Other / Uncertain
                </option>
              </select>
            </label>

            <label className="form-field">
              <span>
                Estimated Repair / Claim Amount
                <small> Optional</small>
              </span>

              <input
                type="number"
                min="0.01"
                step="0.01"
                name="claim_amount"
                value={
                  form.claim_amount
                }
                onChange={change}
                placeholder="Enter an estimate if known"
              />
            </label>
          </div>

          <label className="form-field full-width">
            <span>
              Issue Details
            </span>

            <textarea
              name="fault_description"
              value={
                form.fault_description
              }
              onChange={change}
              rows="5"
              placeholder="Describe the symptoms, how often the issue occurs, any error messages, changes in product behavior, and any troubleshooting you have already tried..."
              required
            />
          </label>
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">
                Step 3
              </p>

              <h2>
                A Few Final Questions
              </h2>

              <p className="section-helper">
                These help AssureX determine
                whether additional review is
                needed.
              </p>
            </div>
          </div>

          <div className="form-grid">
            <label className="form-field">
              <span>
                Purchase receipt available?
              </span>

              <select
                name="receipt_available"
                value={
                  form.receipt_available
                }
                onChange={change}
                required
              >
                <option value="">
                  Select...
                </option>

                {yesNoOptions.map(
                  (option) => (
                    <option
                      key={option}
                      value={option}
                    >
                      {option}
                    </option>
                  )
                )}
              </select>
            </label>

            <label className="form-field">
              <span>
                Product photo available?
              </span>

              <select
                name="product_image_available"
                value={
                  form
                    .product_image_available
                }
                onChange={change}
                required
              >
                <option value="">
                  Select...
                </option>

                {yesNoOptions.map(
                  (option) => (
                    <option
                      key={option}
                      value={option}
                    >
                      {option}
                    </option>
                  )
                )}
              </select>
            </label>

            <label className="form-field">
              <span>
                Fault / damage photo
                available?
              </span>

              <select
                name="fault_evidence_available"
                value={
                  form
                    .fault_evidence_available
                }
                onChange={change}
                required
              >
                <option value="">
                  Select...
                </option>

                {yesNoOptions.map(
                  (option) => (
                    <option
                      key={option}
                      value={option}
                    >
                      {option}
                    </option>
                  )
                )}
              </select>
            </label>

            <label className="form-field">
              <span>
                Has this product been
                repaired before?
              </span>

              <select
                name="previous_repair"
                value={
                  form.previous_repair
                }
                onChange={change}
                required
              >
                <option value="No">
                  No
                </option>

                <option value="Yes">
                  Yes
                </option>
              </select>
            </label>

            {form.previous_repair ===
              'Yes' && (
              <>
                <label className="form-field">
                  <span>
                    Previous Repair Count
                  </span>

                  <input
                    type="number"
                    min="1"
                    name="repair_count"
                    value={
                      form.repair_count
                    }
                    onChange={change}
                    required
                  />
                </label>

                <label className="form-field">
                  <span>
                    Repair Report
                    Available?
                  </span>

                  <select
                    name="repair_report_available"
                    value={
                      form
                        .repair_report_available
                    }
                    onChange={change}
                    required
                  >
                    <option value="">
                      Select...
                    </option>

                    <option value="Yes">
                      Yes
                    </option>

                    <option value="No">
                      No
                    </option>
                  </select>
                </label>

                <label className="form-field">
                  <span>
                    Repaired by Authorized
                    Center?
                  </span>

                  <select
                    name="repair_authorized"
                    value={
                      form
                        .repair_authorized
                    }
                    onChange={change}
                    required
                  >
                    <option value="">
                      Select...
                    </option>

                    <option value="Yes">
                      Yes
                    </option>

                    <option value="No">
                      No
                    </option>

                    <option value="Unknown">
                      Not sure
                    </option>
                  </select>
                </label>
              </>
            )}
          </div>
        </section>

        <section className="assessment-notice">
          <div>
            <strong>
              Automated Claim Assessment
            </strong>

            <p>
              AssureX will verify the
              document data, derive the ML
              features automatically and
              evaluate the claim.
            </p>
          </div>

          <div className="assessment-flow">
            <span>
              Valid → Approved
            </span>

            <span>
              Invalid → Rejected
            </span>

            <span>
              Uncertain → Manual Review
            </span>
          </div>
        </section>

        {error && (
          <div className="alert error">
            {error}
          </div>
        )}

        <div className="form-actions between">
          <button
            type="button"
            className="button secondary"
            onClick={() =>
              onNavigate('home')
            }
          >
            Cancel
          </button>

          <button
            className="button primary large"
            disabled={submitting}
          >
            {submitting
              ? 'Evaluating Claim...'
              : 'Submit Claim'}
          </button>
        </div>
      </form>
    </>
  )
}


function ClaimTimeline({ status }) {
  const final =
    status === 'Approved' ||
    status === 'Rejected'

  return (
    <div className="timeline">
      <div className="timeline-step complete">
        <span>1</span>
        <div>
          <strong>Submitted</strong>
          <small>
            Claim received by AssureX
          </small>
        </div>
      </div>

      <div className="timeline-line complete" />

      <div className="timeline-step complete">
        <span>2</span>
        <div>
          <strong>Under Review</strong>
          <small>
            Warranty review in progress
          </small>
        </div>
      </div>

      <div
        className={`timeline-line ${
          final ? 'complete' : ''
        }`}
      />

      <div
        className={`timeline-step ${
          final ? 'complete' : ''
        }`}
      >
        <span>3</span>
        <div>
          <strong>
            {status === 'Rejected'
              ? 'Rejected'
              : 'Decision'}
          </strong>
          <small>
            {status === 'Approved'
              ? 'Warranty claim approved'
              : status === 'Rejected'
                ? 'Warranty claim rejected'
                : 'Awaiting final decision'}
          </small>
        </div>
      </div>
    </div>
  )
}


function CustomerClaims({
  email,
  setEmail,
  refreshKey,
}) {
  const [claims, setClaims] = useState([])
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!email) {
      setClaims([])
      setSelected(null)
      return
    }

    setLoading(true)

    api(
      `/api/customer/claims?email=${encodeURIComponent(
        email
      )}`
    )
      .then(setClaims)
      .finally(() => setLoading(false))
  }, [email, refreshKey])

  return (
    <>
      <PageHeader
        eyebrow="Customer Portal"
        title="My Claims"
        description="Track your submitted warranty claims and review their current status."
      />

      <CustomerIdentity
        email={email}
        onChange={setEmail}
      />

      <section className="panel">
        {loading ? (
          <LoadingState />
        ) : !email ? (
          <EmptyState
            title="Enter your email"
            description="Enter the email used when submitting your warranty claim."
          />
        ) : claims.length === 0 ? (
          <EmptyState
            title="No claims found"
            description="There are no warranty claims associated with this email."
          />
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Claim ID</th>
                  <th>Product</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Submitted</th>
                </tr>
              </thead>

              <tbody>
                {claims.map((claim) => (
                  <tr
                    key={claim.id}
                    className={
                      selected?.id === claim.id
                        ? 'selected-row'
                        : ''
                    }
                    onClick={() =>
                      setSelected(claim)
                    }
                  >
                    <td className="mono">
                      {claim.claim_id}
                    </td>
                    <td>{claim.product_name}</td>
                    <td>
                      {formatNumber(
                        claim.claim_amount
                      )}
                    </td>
                    <td>
                      <StatusBadge
                        value={claim.status}
                      />
                    </td>
                    <td>
                      {formatDate(
                        claim.created_at
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selected && (
        <section className="panel detail-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">
                Claim Status
              </p>
              <h2>{selected.claim_id}</h2>
            </div>

            <StatusBadge value={selected.status} />
          </div>

          <ClaimTimeline
            status={selected.status}
          />

          <div className="detail-grid">
            <div>
              <span>Product</span>
              <strong>
                {selected.product_name}
              </strong>
            </div>

            <div>
              <span>Serial Number</span>
              <strong>
                {selected.serial_number}
              </strong>
            </div>

            <div>
              <span>Purchase Date</span>
              <strong>
                {selected.purchase_date}
              </strong>
            </div>

            <div>
              <span>Claim Amount</span>
              <strong>
                {formatNumber(
                  selected.claim_amount
                )}
              </strong>
            </div>
          </div>

          <div className="description-box">
            <span>Your Description</span>
            <p>{selected.fault_description}</p>
          </div>
        </section>
      )}
    </>
  )
}


function App() {
  const [backendStatus, setBackendStatus] =
    useState('checking')

  const [viewMode, setViewMode] =
    useState('admin')

  const [adminPage, setAdminPage] =
    useState('dashboard')

  const [customerPage, setCustomerPage] =
    useState('home')

  const [refreshKey, setRefreshKey] =
    useState(0)

  const [customerEmail, setCustomerEmail] =
    useState(
      () =>
        localStorage.getItem(
          'assurex_customer_email'
        ) || ''
    )

  useEffect(() => {
    api('/health')
      .then(() => setBackendStatus('online'))
      .catch(() =>
        setBackendStatus('offline')
      )
  }, [])

  function updateCustomerEmail(value) {
    setCustomerEmail(value)

    localStorage.setItem(
      'assurex_customer_email',
      value
    )
  }

  function refresh() {
    setRefreshKey((value) => value + 1)
  }

  const adminNavigation = [
    ['dashboard', 'Dashboard'],
    ['customer-claims', 'Customer Claims'],
    ['classify', 'New Classification'],
    ['history', 'ML History'],
    ['model', 'Model Intelligence'],
  ]

  const customerNavigation = [
    ['home', 'Home'],
    ['submit', 'Submit Claim'],
    ['my-claims', 'My Claims'],
  ]

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            AX
          </div>

          <div>
            <h2>AssureX</h2>
            <p>Claim Engine</p>
          </div>
        </div>

        <div className="sidebar-section-label">
          {viewMode === 'admin'
            ? 'Administration'
            : 'Customer Portal'}
        </div>

        <nav className="nav-menu">
          {(viewMode === 'admin'
            ? adminNavigation
            : customerNavigation
          ).map(([key, label]) => {
            const active =
              viewMode === 'admin'
                ? adminPage === key
                : customerPage === key

            return (
              <button
                key={key}
                className={`nav-item ${
                  active ? 'active' : ''
                }`}
                onClick={() => {
                  if (viewMode === 'admin') {
                    setAdminPage(key)
                  } else {
                    setCustomerPage(key)
                  }
                }}
              >
                {label}
              </button>
            )
          })}
        </nav>

        <div className="view-switcher">
          <p>Preview As</p>

          <div className="view-buttons">
            <button
              className={
                viewMode === 'admin'
                  ? 'active'
                  : ''
              }
              onClick={() =>
                setViewMode('admin')
              }
            >
              Admin View
            </button>

            <button
              className={
                viewMode === 'customer'
                  ? 'active'
                  : ''
              }
              onClick={() =>
                setViewMode('customer')
              }
            >
              Customer View
            </button>
          </div>
        </div>

        <div className="backend-status">
          <span
            className={`status-dot ${backendStatus}`}
          />
          API {backendStatus}
        </div>
      </aside>

      <main className="main-content">
        {viewMode === 'admin' && (
          <>
            {adminPage === 'dashboard' && (
              <AdminDashboard
                onNavigate={setAdminPage}
                refreshKey={refreshKey}
              />
            )}

            {adminPage ===
              'customer-claims' && (
              <AdminCustomerClaims
                refreshKey={refreshKey}
                onChanged={refresh}
              />
            )}

            {adminPage === 'classify' && (
              <MLClassification
                onCreated={refresh}
              />
            )}

            {adminPage === 'history' && (
              <MLHistory
                refreshKey={refreshKey}
              />
            )}

            {adminPage === 'model' && (
              <ModelInfo />
            )}
          </>
        )}

        {viewMode === 'customer' && (
          <>
            {customerPage === 'home' && (
              <CustomerHome
                email={customerEmail}
                setEmail={updateCustomerEmail}
                onNavigate={setCustomerPage}
                refreshKey={refreshKey}
              />
            )}

            {customerPage === 'submit' && (
              <CustomerSubmit
                email={customerEmail}
                setEmail={updateCustomerEmail}
                onSubmitted={refresh}
                onNavigate={setCustomerPage}
              />
            )}

            {customerPage ===
              'my-claims' && (
              <CustomerClaims
                email={customerEmail}
                setEmail={updateCustomerEmail}
                refreshKey={refreshKey}
              />
            )}
          </>
        )}
      </main>
    </div>
  )
}


export default App
