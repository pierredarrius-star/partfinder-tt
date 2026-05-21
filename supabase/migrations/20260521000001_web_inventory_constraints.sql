ALTER TABLE web_inventory ALTER COLUMN site_id SET NOT NULL;
ALTER TABLE web_inventory ADD CONSTRAINT web_inventory_price_positive CHECK (price >= 0);
