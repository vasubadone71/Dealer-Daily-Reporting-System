-- 1. Master Models
CREATE TABLE IF NOT EXISTS models (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL CHECK (type IN ('Scooter', 'Motorcycle')),
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Master Variants
CREATE TABLE IF NOT EXISTS variants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    model_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (model_id) REFERENCES models(id) ON DELETE CASCADE,
    UNIQUE(model_id, name)
);

-- 3. Master Colors
CREATE TABLE IF NOT EXISTS colors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    hex_code TEXT,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 4. Variant-Color Mapping
CREATE TABLE IF NOT EXISTS variant_colors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    variant_id INTEGER NOT NULL,
    color_id INTEGER NOT NULL,
    is_active INTEGER DEFAULT 1,
    FOREIGN KEY (variant_id) REFERENCES variants(id) ON DELETE CASCADE,
    FOREIGN KEY (color_id) REFERENCES colors(id) ON DELETE CASCADE,
    UNIQUE(variant_id, color_id)
);

-- 5. Daily Reports (Header)
-- (reports table remains from schema.sql, we just link to it)

-- 6. Retail Items (Replaces sales_data)
CREATE TABLE IF NOT EXISTS retail_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    report_id INTEGER NOT NULL,
    variant_color_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE,
    FOREIGN KEY (variant_color_id) REFERENCES variant_colors(id) ON DELETE CASCADE,
    UNIQUE(report_id, variant_color_id)
);

-- 7. Dispatches (Header)
CREATE TABLE IF NOT EXISTS dispatches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_id INTEGER,
    dealer_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    created_by INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Accepted', 'Rejected', 'Completed', 'Initialized', 'Archived')),
    is_opening_stock INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (source_id) REFERENCES dealers(id) ON DELETE SET NULL,
    FOREIGN KEY (dealer_id) REFERENCES dealers(id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX idx_dispatches_unique ON dispatches(dealer_id, date, is_opening_stock, IFNULL(source_id, 0));

-- 8. Dispatch Items
CREATE TABLE IF NOT EXISTS dispatch_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    dispatch_id INTEGER NOT NULL,
    variant_color_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (dispatch_id) REFERENCES dispatches(id) ON DELETE CASCADE,
    FOREIGN KEY (variant_color_id) REFERENCES variant_colors(id) ON DELETE CASCADE,
    UNIQUE(dispatch_id, variant_color_id)
);

-- 9. Daily Stock Balances (Ledger)
CREATE TABLE IF NOT EXISTS daily_stock_balances (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    dealer_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    variant_color_id INTEGER NOT NULL,
    opening_stock INTEGER DEFAULT 0,
    dispatched INTEGER DEFAULT 0,
    retail_sales INTEGER DEFAULT 0,
    adjustment INTEGER DEFAULT 0,
    closing_stock INTEGER DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(dealer_id, date, variant_color_id),
    FOREIGN KEY (dealer_id) REFERENCES dealers(id) ON DELETE CASCADE,
    FOREIGN KEY (variant_color_id) REFERENCES variant_colors(id) ON DELETE CASCADE
);

-- 10. Stock Adjustments
CREATE TABLE IF NOT EXISTS stock_adjustments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    dealer_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    variant_color_id INTEGER NOT NULL,
    adjustment_qty INTEGER NOT NULL,
    reason TEXT,
    created_by INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (dealer_id) REFERENCES dealers(id) ON DELETE CASCADE,
    FOREIGN KEY (variant_color_id) REFERENCES variant_colors(id) ON DELETE CASCADE
);

-- 11. Targets
CREATE TABLE IF NOT EXISTS targets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    target_type TEXT NOT NULL CHECK (target_type IN ('dealer', 'network')),
    target_id INTEGER NOT NULL,
    month TEXT NOT NULL,
    variant_color_id INTEGER, -- Null means overall target, otherwise specific color target
    target_qty INTEGER NOT NULL DEFAULT 0,
    created_by INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(target_type, target_id, month, variant_color_id),
    FOREIGN KEY (variant_color_id) REFERENCES variant_colors(id) ON DELETE CASCADE
);

-- Bookings are already added to reports table during migration
