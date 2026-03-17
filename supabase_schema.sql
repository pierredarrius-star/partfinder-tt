-- Pathfinder-- supabase_schema.sql
-- Run this in your Supabase SQL Editor to set up the Partfinder database Auth Users)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    phone_number TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. Suppliers Table
CREATE TABLE suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    whatsapp_number TEXT NOT NULL,
    phone_number TEXT,
    store_location TEXT, -- e.g. "Chaguanas", "San Juan"
    is_vip BOOLEAN DEFAULT false,
    is_opt_out BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. Inquiries Table (Track customer searches)
CREATE TABLE inquiries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    part_query TEXT NOT NULL, 
    vin TEXT, -- Optional VIN number for precise matching
    status TEXT DEFAULT 'pending_search', -- pending_search, contacting_suppliers, found, not_found, ordered
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 4. Supplier Responses (Track what each supplier said)
CREATE TABLE supplier_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inquiry_id UUID REFERENCES inquiries(id) ON DELETE CASCADE,
    supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'contacted', -- 'contacted', 'replied', 'failed'
    price_quoted NUMERIC,
    raw_response TEXT, -- The AI analysis or raw message
    responded_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Optional: Enable Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_responses ENABLE ROW LEVEL SECURITY;

-- Basic Policies (Can be refined later)
CREATE POLICY "Public profiles are viewable by everyone." ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile." ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile." ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Suppliers viewable by everyone." ON suppliers FOR SELECT USING (true);

CREATE POLICY "Users can view own inquiries." ON inquiries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create inquiries." ON inquiries FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Setup Fuzzy Text Search (pg_trgm extension)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
-- We can add indexes on part queries for fuzzy matching later if we create a standalone catalog.
