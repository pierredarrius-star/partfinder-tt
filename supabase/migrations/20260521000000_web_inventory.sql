CREATE TABLE supplier_sites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  url text NOT NULL,
  platform text,
  catalog_url text NOT NULL,
  currency text DEFAULT 'TTD',
  is_active boolean DEFAULT true,
  last_indexed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE supplier_sites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read" ON supplier_sites FOR SELECT USING (true);

CREATE TABLE web_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid REFERENCES supplier_sites(id) ON DELETE CASCADE,
  part_name text NOT NULL,
  description text,
  price numeric,
  currency text DEFAULT 'TTD',
  product_url text NOT NULL,
  image_url text,
  search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('english', part_name || ' ' || coalesce(description, ''))
  ) STORED,
  last_indexed_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(site_id, product_url)
);

CREATE INDEX web_inventory_search_idx ON web_inventory USING GIN(search_vector);
CREATE INDEX web_inventory_site_id_idx ON web_inventory(site_id);

ALTER TABLE web_inventory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read" ON web_inventory FOR SELECT USING (true);

INSERT INTO supplier_sites (name, url, platform, catalog_url, currency) VALUES
  ('TNT Bamboo Online', 'https://tntbambooonline.com', 'woocommerce', 'https://tntbambooonline.com/shop/', 'USD'),
  ('Brown''s Auto Parts', 'https://brownsautopartstt.com', 'woocommerce', 'https://brownsautopartstt.com/shop/', 'TTD'),
  ('X2Board Automotive', 'https://www.x2board.com', 'wix', 'https://www.x2board.com/parts', 'TTD');
