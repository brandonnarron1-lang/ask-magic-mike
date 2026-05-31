-- Migration 00006: Properties table

CREATE TABLE properties (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Normalized address
  address_line1   TEXT NOT NULL,
  address_line2   TEXT,
  city            TEXT NOT NULL,
  state           TEXT NOT NULL DEFAULT 'FL',
  zip             TEXT NOT NULL,
  county          TEXT,
  fips_code       TEXT,

  -- Geocode
  latitude        NUMERIC(10,7),
  longitude       NUMERIC(10,7),
  geocode_source  TEXT,
  geocoded_at     TIMESTAMPTZ,

  -- Property data (filled by AVM / data provider)
  beds            SMALLINT,
  baths           NUMERIC(4,2),
  sqft            INTEGER,
  lot_sqft        INTEGER,
  year_built      SMALLINT,
  property_type   TEXT CHECK (property_type IN (
    'single_family','condo','townhouse','multi_family','land','commercial','other'
  )),
  parcel_id       TEXT,

  -- Market data snapshot (all amounts in cents)
  last_sale_price BIGINT,
  last_sale_date  DATE,
  estimated_value BIGINT,
  estimated_at    TIMESTAMPTZ,

  -- Linked lead
  lead_id         UUID REFERENCES leads(id)
);

CREATE INDEX idx_properties_zip ON properties(zip);
CREATE INDEX idx_properties_lead ON properties(lead_id);
CREATE UNIQUE INDEX idx_properties_parcel ON properties(fips_code, parcel_id)
  WHERE fips_code IS NOT NULL AND parcel_id IS NOT NULL;

CREATE TRIGGER properties_updated_at
  BEFORE UPDATE ON properties
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
