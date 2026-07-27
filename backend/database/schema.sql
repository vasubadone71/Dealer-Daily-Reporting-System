CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    company_name TEXT NOT NULL DEFAULT 'My Shiva Honda',
    telegram_bot_token TEXT,
    notification_reminder_1 TEXT DEFAULT '18:30',
    notification_reminder_2 TEXT DEFAULT '19:30',
    notification_reminder_3 TEXT DEFAULT '20:30',
    notification_reminder_4 TEXT DEFAULT '21:30',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    telegram_chat_id TEXT,
    role TEXT NOT NULL CHECK (role IN ('super_admin', 'network_manager')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    otp_code TEXT,
    otp_expires_at DATETIME,
    otp_attempts INTEGER DEFAULT 0,
    locked_until DATETIME,
    device_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS networks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS stock_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    report_id INTEGER UNIQUE NOT NULL,
    activa_110_std INTEGER DEFAULT 0,
    activa_110_dlx INTEGER DEFAULT 0,
    activa_h_smart INTEGER DEFAULT 0,
    activa_125 INTEGER DEFAULT 0,
    activa_125_h_smart INTEGER DEFAULT 0,
    cb_hornet125 INTEGER DEFAULT 0,
    shine100dx INTEGER DEFAULT 0,
    sp160 INTEGER DEFAULT 0,
    sp125_drum INTEGER DEFAULT 0,
    sp125_disc INTEGER DEFAULT 0,
    shine125_drum INTEGER DEFAULT 0,
    shine125_disc INTEGER DEFAULT 0,
    shine100 INTEGER DEFAULT 0,
    shine100_2b INTEGER DEFAULT 0,
    hornet2_0 INTEGER DEFAULT 0,
    FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('broadcast', 'dealer', 'network', 'urgent')),
    target_id INTEGER, -- dealer_id or network_id
    sent_by INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sent_by) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS activity_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    actor_type TEXT NOT NULL CHECK (actor_type IN ('admin', 'dealer', 'system')),
    actor_id INTEGER, -- admin user id or dealer id
    username TEXT NOT NULL, -- admin username or dealer_code
    action TEXT NOT NULL,
    details TEXT,
    ip_address TEXT,
    device_id TEXT,
    device_name TEXT,
    os_version TEXT,
    app_version TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS report_versions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    report_id INTEGER NOT NULL,
    version_num INTEGER NOT NULL,
    data_snapshot TEXT NOT NULL,
    edited_by_type TEXT NOT NULL CHECK (edited_by_type IN ('dealer', 'admin', 'system')),
    edited_by_id INTEGER NOT NULL,
    reason TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    notification_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL, -- dealer_id or admin_id
    user_type TEXT NOT NULL CHECK (user_type IN ('dealer', 'admin')),
    is_read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(notification_id, user_id, user_type),
    FOREIGN KEY (notification_id) REFERENCES notifications(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS admin_notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    dealer_id INTEGER NOT NULL,
    date TEXT NOT NULL, -- YYYY-MM-DD
    note TEXT NOT NULL,
    created_by INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (dealer_id) REFERENCES dealers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS document_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    dealer_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Requested' CHECK (status IN ('Requested', 'Uploaded', 'Verified', 'Rejected')),
    file_url TEXT,
    requested_by INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (dealer_id) REFERENCES dealers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS models (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL CHECK (type IN ('Scooter', 'Motorcycle')),
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
, is_focus INTEGER DEFAULT 0);

CREATE TABLE IF NOT EXISTS variants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    model_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (model_id) REFERENCES models(id) ON DELETE CASCADE,
    UNIQUE(model_id, name)
);

CREATE TABLE IF NOT EXISTS colors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    hex_code TEXT,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS variant_colors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    variant_id INTEGER NOT NULL,
    color_id INTEGER NOT NULL,
    is_active INTEGER DEFAULT 1,
    FOREIGN KEY (variant_id) REFERENCES variants(id) ON DELETE CASCADE,
    FOREIGN KEY (color_id) REFERENCES colors(id) ON DELETE CASCADE,
    UNIQUE(variant_id, color_id)
);

CREATE TABLE IF NOT EXISTS retail_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    report_id INTEGER NOT NULL,
    variant_color_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE,
    FOREIGN KEY (variant_color_id) REFERENCES variant_colors(id) ON DELETE CASCADE,
    UNIQUE(report_id, variant_color_id)
);

CREATE TABLE IF NOT EXISTS dispatch_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    dispatch_id INTEGER NOT NULL,
    variant_color_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (dispatch_id) REFERENCES dispatches(id) ON DELETE CASCADE,
    FOREIGN KEY (variant_color_id) REFERENCES variant_colors(id) ON DELETE CASCADE,
    UNIQUE(dispatch_id, variant_color_id)
);

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

CREATE TABLE IF NOT EXISTS targets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    target_type TEXT NOT NULL CHECK (target_type IN ('dealer', 'network')),
    target_id INTEGER NOT NULL,
    month TEXT NOT NULL,
    variant_color_id INTEGER, -- Null means overall target, otherwise specific color target
    target_qty INTEGER NOT NULL DEFAULT 0,
    created_by INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP, model_id INTEGER REFERENCES models(id) ON DELETE CASCADE,
    UNIQUE(target_type, target_id, month, variant_color_id),
    FOREIGN KEY (variant_color_id) REFERENCES variant_colors(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "reports" (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            dealer_id INTEGER NOT NULL,
            date TEXT NOT NULL,
            submitted_at DATETIME,
            status TEXT NOT NULL CHECK (status IN ('Submitted', 'Pending', 'Late', 'Not Sent', 'Locked')),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            today_booking INTEGER DEFAULT 0,
            total_booking INTEGER DEFAULT 0, scanned_frames TEXT,
            UNIQUE(dealer_id, date),
            FOREIGN KEY (dealer_id) REFERENCES dealers(id) ON DELETE CASCADE
        );

CREATE TABLE IF NOT EXISTS "dealers" (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            dealer_code TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            password_hash TEXT NOT NULL,
            network_id INTEGER NOT NULL,
            district TEXT NOT NULL,
            state TEXT NOT NULL,
            dealer_type TEXT NOT NULL CHECK (dealer_type IN ('AD', 'FO', 'EC', 'ASC', 'Sub Dealer', 'Showroom', 'Godown')),
            status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
            device_id TEXT,
            push_token TEXT,
            last_login_at DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            role TEXT NOT NULL DEFAULT 'dealer' CHECK (role IN ('dealer', 'showroom', 'godown')), gst_no TEXT,
            FOREIGN KEY (network_id) REFERENCES networks(id) ON DELETE RESTRICT
        );

CREATE TABLE IF NOT EXISTS "dispatches" (
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

CREATE TABLE IF NOT EXISTS vehicles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    dealer_id INTEGER NOT NULL,
    variant_color_id INTEGER NOT NULL,
    frame_number TEXT NOT NULL UNIQUE,
    engine_number TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'IN_GODOWN' 
        CHECK (status IN ('IN_GODOWN', 'IN_SHOWROOM', 'IN_TRANSIT_TO_DEALER', 'AT_DEALER', 'RETAILED', 'BLOCKED', 'DAMAGED', 'RETURNED', 'SCRAPPED')),
    location_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (dealer_id) REFERENCES dealers(id) ON DELETE CASCADE,
    FOREIGN KEY (variant_color_id) REFERENCES variant_colors(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS vehicle_movements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vehicle_id INTEGER NOT NULL,
    from_status TEXT,
    to_status TEXT NOT NULL,
    moved_by INTEGER NOT NULL,
    date DATETIME DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS dispatch_ledgers (id INTEGER PRIMARY KEY AUTOINCREMENT, from_id INTEGER, to_id INTEGER, frames_json TEXT, created_by INTEGER, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);