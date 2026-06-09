import initSqlJs, { type Database } from 'sql.js'

let db: Database

export function getDb(): Database {
  if (!db) throw new Error('Database not initialized')
  return db
}

export interface Row { [key: string]: any }

export function queryOne(sql: string, params?: any[]): Row | null {
  const d = getDb()
  const result = d.exec(sql, params)
  if (result.length === 0 || result[0].values.length === 0) return null
  const cols = result[0].columns
  const vals = result[0].values[0]
  return cols.reduce((obj: Row, col: string, i: number) => { obj[col] = vals[i]; return obj }, {})
}

export function queryAll(sql: string, params?: any[]): Row[] {
  const d = getDb()
  const result = d.exec(sql, params)
  if (result.length === 0) return []
  const cols = result[0].columns
  return result[0].values.map(vals =>
    cols.reduce((obj: Row, col: string, i: number) => { obj[col] = vals[i]; return obj }, {})
  )
}

export function run(sql: string, params?: any[]): void {
  const d = getDb()
  d.run(sql, params)
}

export async function initDatabase(): Promise<void> {
  const SQL = await initSqlJs()
  db = new SQL.Database()

  createTables()
  seedData()

  console.log('Database initialized with seed data')
}

function createTables() {
  const d = getDb()

  d.run(`CREATE TABLE areas (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    bounds TEXT NOT NULL
  )`)

  d.run(`CREATE TABLE electronic_fences (
    id TEXT PRIMARY KEY,
    area_id TEXT NOT NULL REFERENCES areas(id),
    polygon_coords TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'parking'
  )`)

  d.run(`CREATE TABLE users (
    id TEXT PRIMARY KEY,
    phone TEXT UNIQUE,
    name TEXT NOT NULL,
    password TEXT,
    role TEXT NOT NULL CHECK(role IN ('user', 'ops', 'supervisor', 'admin')),
    credit_score INTEGER DEFAULT 100,
    balance REAL DEFAULT 0,
    deposit REAL DEFAULT 0,
    area_id TEXT REFERENCES areas(id),
    created_at TEXT DEFAULT (datetime('now'))
  )`)

  d.run(`CREATE TABLE vehicles (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    lat REAL NOT NULL,
    lng REAL NOT NULL,
    battery INTEGER NOT NULL DEFAULT 100,
    status TEXT NOT NULL DEFAULT 'available' CHECK(status IN ('available', 'riding', 'maintenance', 'low_battery', 'fault')),
    area_id TEXT REFERENCES areas(id),
    last_report_time TEXT DEFAULT (datetime('now'))
  )`)

  d.run(`CREATE TABLE ride_orders (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    vehicle_id TEXT NOT NULL REFERENCES vehicles(id),
    start_time TEXT NOT NULL DEFAULT (datetime('now')),
    end_time TEXT,
    start_lat REAL NOT NULL,
    start_lng REAL NOT NULL,
    end_lat REAL,
    end_lng REAL,
    distance REAL DEFAULT 0,
    duration INTEGER DEFAULT 0,
    fee REAL DEFAULT 0,
    dispatch_fee REAL DEFAULT 0,
    credit_deducted INTEGER DEFAULT 0,
    in_fence INTEGER DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'riding' CHECK(status IN ('riding', 'completed', 'charging'))
  )`)

  d.run(`CREATE TABLE ride_tracks (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL REFERENCES ride_orders(id),
    lat REAL NOT NULL,
    lng REAL NOT NULL,
    reported_at TEXT DEFAULT (datetime('now'))
  )`)

  d.run(`CREATE TABLE ops_tasks (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL CHECK(type IN ('battery_swap', 'repair', 'dispatch')),
    vehicle_id TEXT NOT NULL REFERENCES vehicles(id),
    fault_type TEXT,
    fault_photos TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'in_progress', 'completed')),
    assigned_to TEXT REFERENCES users(id),
    priority INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    completed_at TEXT,
    repair_photos TEXT
  )`)

  d.run(`CREATE TABLE pricing_rules (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    time_slots TEXT NOT NULL,
    weather_adjustments TEXT,
    active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  )`)

  d.run(`CREATE TABLE notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    type TEXT NOT NULL CHECK(type IN ('unlock', 'return', 'fault', 'dispatch', 'system')),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    read INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    related_id TEXT
  )`)

  d.run(`CREATE TABLE transactions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    type TEXT NOT NULL CHECK(type IN ('ride_fee', 'dispatch_fee', 'deposit_pay', 'deposit_refund', 'topup', 'arrears')),
    amount REAL NOT NULL,
    balance_after REAL NOT NULL,
    related_id TEXT,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'completed' CHECK(status IN ('completed', 'pending', 'arrears')),
    created_at TEXT DEFAULT (datetime('now'))
  )`)

  d.run(`CREATE TABLE monthly_reports (
    id TEXT PRIMARY KEY,
    month TEXT NOT NULL,
    area_id TEXT NOT NULL REFERENCES areas(id),
    ride_count INTEGER DEFAULT 0,
    revenue REAL DEFAULT 0,
    dispatch_revenue REAL DEFAULT 0,
    ops_cost REAL DEFAULT 0,
    battery_swap_cost REAL DEFAULT 0,
    repair_cost REAL DEFAULT 0,
    arrears_amount REAL DEFAULT 0,
    profit REAL DEFAULT 0
  )`)

  d.run(`CREATE INDEX idx_vehicles_area ON vehicles(area_id)`)
  d.run(`CREATE INDEX idx_vehicles_status ON vehicles(status)`)
  d.run(`CREATE INDEX idx_ride_orders_user ON ride_orders(user_id)`)
  d.run(`CREATE INDEX idx_ride_orders_vehicle ON ride_orders(vehicle_id)`)
  d.run(`CREATE INDEX idx_ride_tracks_order ON ride_tracks(order_id)`)
  d.run(`CREATE INDEX idx_ops_tasks_assigned ON ops_tasks(assigned_to)`)
  d.run(`CREATE INDEX idx_ops_tasks_status ON ops_tasks(status)`)
  d.run(`CREATE INDEX idx_notifications_user ON notifications(user_id)`)
  d.run(`CREATE INDEX idx_notifications_read ON notifications(read)`)
  d.run(`CREATE INDEX idx_monthly_reports_month ON monthly_reports(month)`)
  d.run(`CREATE INDEX idx_transactions_user ON transactions(user_id)`)
  d.run(`CREATE INDEX idx_transactions_type ON transactions(type)`)
}

function seedData() {
  const d = getDb()
  const now = new Date().toISOString()

  seedAreas(d)
  seedFences(d)
  seedUsers(d, now)
  seedVehicles(d, now)
  seedRideOrders(d, now)
  seedRideTracks(d, now)
  seedOpsTasks(d, now)
  seedPricingRules(d, now)
  seedNotifications(d, now)
  seedMonthlyReports(d, now)
  seedTransactions(d, now)
}

function seedAreas(d: Database) {
  const areas = [
    { id: 'area1', name: '朝阳区', bounds: JSON.stringify({ center: [39.921, 116.443], radius: 5000 }) },
    { id: 'area2', name: '海淀区', bounds: JSON.stringify({ center: [39.959, 116.298], radius: 5000 }) },
    { id: 'area3', name: '西城区', bounds: JSON.stringify({ center: [39.912, 116.366], radius: 4000 }) },
    { id: 'area4', name: '东城区', bounds: JSON.stringify({ center: [39.928, 116.416], radius: 4000 }) },
    { id: 'area5', name: '丰台区', bounds: JSON.stringify({ center: [39.858, 116.286], radius: 5000 }) },
  ]
  for (const a of areas) {
    d.run('INSERT INTO areas VALUES (?, ?, ?)', [a.id, a.name, a.bounds])
  }
}

function seedFences(d: Database) {
  const fences = [
    {
      id: 'fence1', area_id: 'area1', type: 'parking',
      polygon_coords: JSON.stringify([[39.935, 116.425], [39.935, 116.461], [39.907, 116.461], [39.907, 116.425]])
    },
    {
      id: 'fence2', area_id: 'area2', type: 'parking',
      polygon_coords: JSON.stringify([[39.975, 116.280], [39.975, 116.316], [39.943, 116.316], [39.943, 116.280]])
    },
    {
      id: 'fence3', area_id: 'area3', type: 'parking',
      polygon_coords: JSON.stringify([[39.926, 116.348], [39.926, 116.384], [39.898, 116.384], [39.898, 116.348]])
    },
    {
      id: 'fence4', area_id: 'area4', type: 'parking',
      polygon_coords: JSON.stringify([[39.942, 116.398], [39.942, 116.434], [39.914, 116.434], [39.914, 116.398]])
    },
    {
      id: 'fence5', area_id: 'area5', type: 'parking',
      polygon_coords: JSON.stringify([[39.872, 116.268], [39.872, 116.304], [39.844, 116.304], [39.844, 116.268]])
    },
    {
      id: 'fence6', area_id: 'area1', type: 'no_parking',
      polygon_coords: JSON.stringify([[39.930, 116.430], [39.930, 116.440], [39.920, 116.440], [39.920, 116.430]])
    },
    {
      id: 'fence7', area_id: 'area2', type: 'no_parking',
      polygon_coords: JSON.stringify([[39.965, 116.290], [39.965, 116.300], [39.955, 116.300], [39.955, 116.290]])
    },
  ]
  for (const f of fences) {
    d.run('INSERT INTO electronic_fences VALUES (?, ?, ?, ?)', [f.id, f.area_id, f.polygon_coords, f.type])
  }
}

function seedUsers(d: Database, now: string) {
  const users = [
    { id: 'u1', phone: null, name: 'root', password: 'admin123', role: 'admin', credit_score: 100, balance: 0, deposit: 0, area_id: null },
    { id: 'u2', phone: null, name: 'ops1', password: 'ops123', role: 'ops', credit_score: 100, balance: 0, deposit: 0, area_id: 'area1' },
    { id: 'u3', phone: null, name: 'ops2', password: 'ops123', role: 'ops', credit_score: 100, balance: 0, deposit: 0, area_id: 'area2' },
    { id: 'u4', phone: null, name: 'supervisor', password: 'super123', role: 'supervisor', credit_score: 100, balance: 0, deposit: 0, area_id: 'area1' },
    { id: 'u5', phone: null, name: 'supervisor2', password: 'super123', role: 'supervisor', credit_score: 100, balance: 0, deposit: 0, area_id: 'area2' },
    { id: 'u6', phone: '13800000001', name: '用户赵明', password: null, role: 'user', credit_score: 95, balance: 50.5, deposit: 0, area_id: null },
    { id: 'u7', phone: '13800000002', name: '用户孙丽', password: null, role: 'user', credit_score: 88, balance: 32.0, deposit: 0, area_id: null },
    { id: 'u8', phone: '13800000003', name: '用户周杰', password: null, role: 'user', credit_score: 55, balance: 10.0, deposit: 199, area_id: null },
    { id: 'u9', phone: '13800000004', name: '用户吴静', password: null, role: 'user', credit_score: 72, balance: 25.8, deposit: 0, area_id: null },
    { id: 'u10', phone: '13800000005', name: '用户郑涛', password: null, role: 'user', credit_score: 100, balance: 80.0, deposit: 0, area_id: null },
  ]
  for (const u of users) {
    d.run('INSERT INTO users VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [u.id, u.phone, u.name, u.password, u.role, u.credit_score, u.balance, u.deposit, u.area_id, now])
  }
}

function seedVehicles(d: Database, now: string) {
  const vehicles = [
    { id: 'v1', code: 'BJ10001', lat: 39.918, lng: 116.445, battery: 85, status: 'available', area_id: 'area1' },
    { id: 'v2', code: 'BJ10002', lat: 39.924, lng: 116.438, battery: 72, status: 'available', area_id: 'area1' },
    { id: 'v3', code: 'BJ10003', lat: 39.912, lng: 116.452, battery: 15, status: 'low_battery', area_id: 'area1' },
    { id: 'v4', code: 'BJ10004', lat: 39.930, lng: 116.440, battery: 90, status: 'available', area_id: 'area1' },
    { id: 'v5', code: 'BJ10005', lat: 39.915, lng: 116.455, battery: 0, status: 'fault', area_id: 'area1' },
    { id: 'v6', code: 'BJ10006', lat: 39.960, lng: 116.300, battery: 78, status: 'available', area_id: 'area2' },
    { id: 'v7', code: 'BJ10007', lat: 39.955, lng: 116.295, battery: 45, status: 'available', area_id: 'area2' },
    { id: 'v8', code: 'BJ10008', lat: 39.965, lng: 116.310, battery: 10, status: 'low_battery', area_id: 'area2' },
    { id: 'v9', code: 'BJ10009', lat: 39.950, lng: 116.288, battery: 92, status: 'available', area_id: 'area2' },
    { id: 'v10', code: 'BJ10010', lat: 39.958, lng: 116.305, battery: 65, status: 'available', area_id: 'area2' },
    { id: 'v11', code: 'BJ10011', lat: 39.910, lng: 116.370, battery: 88, status: 'available', area_id: 'area3' },
    { id: 'v12', code: 'BJ10012', lat: 39.915, lng: 116.360, battery: 30, status: 'low_battery', area_id: 'area3' },
    { id: 'v13', code: 'BJ10013', lat: 39.905, lng: 116.375, battery: 95, status: 'available', area_id: 'area3' },
    { id: 'v14', code: 'BJ10014', lat: 39.908, lng: 116.365, battery: 0, status: 'maintenance', area_id: 'area3' },
    { id: 'v15', code: 'BJ10015', lat: 39.920, lng: 116.380, battery: 55, status: 'available', area_id: 'area3' },
    { id: 'v16', code: 'BJ10016', lat: 39.925, lng: 116.420, battery: 82, status: 'available', area_id: 'area4' },
    { id: 'v17', code: 'BJ10017', lat: 39.930, lng: 116.410, battery: 18, status: 'low_battery', area_id: 'area4' },
    { id: 'v18', code: 'BJ10018', lat: 39.922, lng: 116.425, battery: 70, status: 'available', area_id: 'area4' },
    { id: 'v19', code: 'BJ10019', lat: 39.935, lng: 116.415, battery: 60, status: 'available', area_id: 'area4' },
    { id: 'v20', code: 'BJ10020', lat: 39.928, lng: 116.430, battery: 40, status: 'riding', area_id: 'area4' },
    { id: 'v21', code: 'BJ10021', lat: 39.855, lng: 116.290, battery: 75, status: 'available', area_id: 'area5' },
    { id: 'v22', code: 'BJ10022', lat: 39.862, lng: 116.280, battery: 8, status: 'low_battery', area_id: 'area5' },
    { id: 'v23', code: 'BJ10023', lat: 39.850, lng: 116.295, battery: 93, status: 'available', area_id: 'area5' },
    { id: 'v24', code: 'BJ10024', lat: 39.858, lng: 116.285, battery: 50, status: 'available', area_id: 'area5' },
    { id: 'v25', code: 'BJ10025', lat: 39.865, lng: 116.300, battery: 35, status: 'available', area_id: 'area5' },
    { id: 'v26', code: 'BJ10026', lat: 39.920, lng: 116.450, battery: 68, status: 'riding', area_id: 'area1' },
    { id: 'v27', code: 'BJ10027', lat: 39.962, lng: 116.292, battery: 22, status: 'available', area_id: 'area2' },
    { id: 'v28', code: 'BJ10028', lat: 39.912, lng: 116.372, battery: 58, status: 'available', area_id: 'area3' },
    { id: 'v29', code: 'BJ10029', lat: 39.926, lng: 116.418, battery: 0, status: 'fault', area_id: 'area4' },
    { id: 'v30', code: 'BJ10030', lat: 39.860, lng: 116.298, battery: 42, status: 'available', area_id: 'area5' },
  ]
  for (const v of vehicles) {
    d.run('INSERT INTO vehicles VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [v.id, v.code, v.lat, v.lng, v.battery, v.status, v.area_id, now])
  }
}

function seedRideOrders(d: Database, now: string) {
  const baseTime = new Date()
  baseTime.setDate(baseTime.getDate() - 1)

  const orders = [
    {
      id: 'r1', user_id: 'u6', vehicle_id: 'v1',
      start_time: new Date(baseTime.getTime() - 7200000).toISOString(),
      end_time: new Date(baseTime.getTime() - 6900000).toISOString(),
      start_lat: 39.920, start_lng: 116.440,
      end_lat: 39.915, end_lng: 116.455,
      distance: 2.5, duration: 5, fee: 4.5, dispatch_fee: 0, credit_deducted: 0,
      in_fence: 1, status: 'completed'
    },
    {
      id: 'r2', user_id: 'u7', vehicle_id: 'v6',
      start_time: new Date(baseTime.getTime() - 5400000).toISOString(),
      end_time: new Date(baseTime.getTime() - 5100000).toISOString(),
      start_lat: 39.960, start_lng: 116.300,
      end_lat: 39.955, end_lng: 116.295,
      distance: 1.8, duration: 5, fee: 3.5, dispatch_fee: 0, credit_deducted: 0,
      in_fence: 1, status: 'completed'
    },
    {
      id: 'r3', user_id: 'u8', vehicle_id: 'v11',
      start_time: new Date(baseTime.getTime() - 3600000).toISOString(),
      end_time: new Date(baseTime.getTime() - 3300000).toISOString(),
      start_lat: 39.910, start_lng: 116.370,
      end_lat: 39.900, end_lng: 116.380,
      distance: 3.2, duration: 5, fee: 5.8, dispatch_fee: 15, credit_deducted: 5,
      in_fence: 0, status: 'completed'
    },
    {
      id: 'r4', user_id: 'u9', vehicle_id: 'v16',
      start_time: new Date(baseTime.getTime() - 1800000).toISOString(),
      end_time: new Date(baseTime.getTime() - 1500000).toISOString(),
      start_lat: 39.925, start_lng: 116.420,
      end_lat: 39.920, end_lng: 116.430,
      distance: 1.5, duration: 5, fee: 3.0, dispatch_fee: 0, credit_deducted: 0,
      in_fence: 1, status: 'completed'
    },
    {
      id: 'r5', user_id: 'u10', vehicle_id: 'v21',
      start_time: new Date(baseTime.getTime() - 900000).toISOString(),
      end_time: new Date(baseTime.getTime() - 600000).toISOString(),
      start_lat: 39.855, start_lng: 116.290,
      end_lat: 39.862, end_lng: 116.280,
      distance: 2.0, duration: 5, fee: 4.0, dispatch_fee: 0, credit_deducted: 0,
      in_fence: 1, status: 'completed'
    },
    {
      id: 'r6', user_id: 'u6', vehicle_id: 'v4',
      start_time: new Date(baseTime.getTime() - 600000).toISOString(),
      end_time: null,
      start_lat: 39.930, start_lng: 116.440,
      end_lat: null, end_lng: null,
      distance: 0, duration: 0, fee: 0, dispatch_fee: 0, credit_deducted: 0,
      in_fence: 1, status: 'riding'
    },
  ]
  for (const o of orders) {
    d.run('INSERT INTO ride_orders VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [o.id, o.user_id, o.vehicle_id, o.start_time, o.end_time, o.start_lat, o.start_lng,
        o.end_lat, o.end_lng, o.distance, o.duration, o.fee, o.dispatch_fee, o.credit_deducted,
        o.in_fence, o.status])
  }
}

function seedRideTracks(d: Database, now: string) {
  const tracks = [
    { id: 't1', order_id: 'r1', lat: 39.918, lng: 116.442, reported_at: new Date(Date.now() - 7150000).toISOString() },
    { id: 't2', order_id: 'r1', lat: 39.916, lng: 116.448, reported_at: new Date(Date.now() - 7050000).toISOString() },
    { id: 't3', order_id: 'r2', lat: 39.958, lng: 116.298, reported_at: new Date(Date.now() - 5350000).toISOString() },
    { id: 't4', order_id: 'r3', lat: 39.908, lng: 116.374, reported_at: new Date(Date.now() - 3550000).toISOString() },
    { id: 't5', order_id: 'r4', lat: 39.923, lng: 116.424, reported_at: new Date(Date.now() - 1750000).toISOString() },
    { id: 't6', order_id: 'r6', lat: 39.929, lng: 116.441, reported_at: new Date(Date.now() - 550000).toISOString() },
  ]
  for (const t of tracks) {
    d.run('INSERT INTO ride_tracks VALUES (?, ?, ?, ?, ?)', [t.id, t.order_id, t.lat, t.lng, t.reported_at])
  }
}

function seedOpsTasks(d: Database, now: string) {
  const tasks = [
    {
      id: 'ot1', type: 'battery_swap', vehicle_id: 'v3', fault_type: null, fault_photos: null,
      status: 'pending', assigned_to: 'u2', priority: 2,
      created_at: new Date(Date.now() - 3600000).toISOString(), completed_at: null, repair_photos: null
    },
    {
      id: 'ot2', type: 'battery_swap', vehicle_id: 'v8', fault_type: null, fault_photos: null,
      status: 'pending', assigned_to: 'u3', priority: 2,
      created_at: new Date(Date.now() - 3000000).toISOString(), completed_at: null, repair_photos: null
    },
    {
      id: 'ot3', type: 'repair', vehicle_id: 'v5', fault_type: 'brake_failure', fault_photos: '[]',
      status: 'in_progress', assigned_to: 'u2', priority: 3,
      created_at: new Date(Date.now() - 7200000).toISOString(), completed_at: null, repair_photos: null
    },
    {
      id: 'ot4', type: 'repair', vehicle_id: 'v29', fault_type: 'tire_damage', fault_photos: '[]',
      status: 'pending', assigned_to: 'u3', priority: 3,
      created_at: new Date(Date.now() - 1800000).toISOString(), completed_at: null, repair_photos: null
    },
    {
      id: 'ot5', type: 'dispatch', vehicle_id: 'v14', fault_type: null, fault_photos: null,
      status: 'completed', assigned_to: 'u2', priority: 1,
      created_at: new Date(Date.now() - 86400000).toISOString(),
      completed_at: new Date(Date.now() - 79200000).toISOString(), repair_photos: null
    },
    {
      id: 'ot6', type: 'battery_swap', vehicle_id: 'v22', fault_type: null, fault_photos: null,
      status: 'pending', assigned_to: 'u3', priority: 2,
      created_at: new Date(Date.now() - 1200000).toISOString(), completed_at: null, repair_photos: null
    },
    {
      id: 'ot7', type: 'battery_swap', vehicle_id: 'v17', fault_type: null, fault_photos: null,
      status: 'pending', assigned_to: 'u2', priority: 1,
      created_at: new Date(Date.now() - 600000).toISOString(), completed_at: null, repair_photos: null
    },
  ]
  for (const t of tasks) {
    d.run('INSERT INTO ops_tasks VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [t.id, t.type, t.vehicle_id, t.fault_type, t.fault_photos, t.status, t.assigned_to,
        t.priority, t.created_at, t.completed_at, t.repair_photos])
  }
}

function seedPricingRules(d: Database, now: string) {
  const rules = [
    {
      id: 'pr1', name: '早高峰', active: 1,
      time_slots: JSON.stringify([{ start: '07:00', end: '09:00', basePrice: 2, timeRate: 1.5, distanceRate: 0.75 }]),
      weather_adjustments: null, created_at: now
    },
    {
      id: 'pr2', name: '平峰', active: 1,
      time_slots: JSON.stringify([{ start: '09:00', end: '17:00', basePrice: 2, timeRate: 1.0, distanceRate: 0.5 }]),
      weather_adjustments: null, created_at: now
    },
    {
      id: 'pr3', name: '晚高峰', active: 1,
      time_slots: JSON.stringify([{ start: '17:00', end: '19:00', basePrice: 2, timeRate: 1.5, distanceRate: 0.75 }]),
      weather_adjustments: null, created_at: now
    },
    {
      id: 'pr4', name: '夜间', active: 1,
      time_slots: JSON.stringify([{ start: '19:00', end: '07:00', basePrice: 2, timeRate: 0.8, distanceRate: 0.4 }]),
      weather_adjustments: null, created_at: now
    },
  ]
  for (const r of rules) {
    d.run('INSERT INTO pricing_rules VALUES (?, ?, ?, ?, ?, ?)',
      [r.id, r.name, r.time_slots, r.weather_adjustments, r.active, r.created_at])
  }
}

function seedNotifications(d: Database, now: string) {
  const notifications = [
    { id: 'n1', user_id: 'u6', type: 'unlock', title: '开锁成功', content: '您已成功解锁车辆 BJ10001，祝您骑行愉快', read: 1, created_at: new Date(Date.now() - 7200000).toISOString(), related_id: 'r1' },
    { id: 'n2', user_id: 'u6', type: 'return', title: '还车成功', content: '您已成功归还车辆 BJ10001，本次骑行费用4.5元', read: 1, created_at: new Date(Date.now() - 6900000).toISOString(), related_id: 'r1' },
    { id: 'n3', user_id: 'u8', type: 'return', title: '还车提醒', content: '您在电子围栏外还车，已加收调度费15元，扣除信用分5分', read: 0, created_at: new Date(Date.now() - 3300000).toISOString(), related_id: 'r3' },
    { id: 'n4', user_id: 'u2', type: 'dispatch', title: '新任务分配', content: '您有新的换电任务：车辆 BJ10003 电量不足，请及时处理', read: 0, created_at: new Date(Date.now() - 3600000).toISOString(), related_id: 'ot1' },
    { id: 'n5', user_id: 'u3', type: 'dispatch', title: '新任务分配', content: '您有新的换电任务：车辆 BJ10008 电量不足，请及时处理', read: 0, created_at: new Date(Date.now() - 3000000).toISOString(), related_id: 'ot2' },
    { id: 'n6', user_id: 'u6', type: 'system', title: '信用分变动', content: '您的信用分已更新为95分', read: 1, created_at: new Date(Date.now() - 6900000).toISOString(), related_id: null },
    { id: 'n7', user_id: 'u8', type: 'system', title: '押金缴纳通知', content: '因信用分低于60分，您已缴纳押金199元', read: 1, created_at: new Date(Date.now() - 86400000).toISOString(), related_id: null },
    { id: 'n8', user_id: 'u1', type: 'fault', title: '故障报告', content: '用户报告车辆 BJ10005 存在刹车故障，请关注', read: 0, created_at: new Date(Date.now() - 7200000).toISOString(), related_id: 'v5' },
  ]
  for (const n of notifications) {
    d.run('INSERT INTO notifications VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [n.id, n.user_id, n.type, n.title, n.content, n.read, n.created_at, n.related_id])
  }
}

function seedMonthlyReports(d: Database, now: string) {
  const reports = [
    { id: 'mr1', month: '2026-03', area_id: 'area1', ride_count: 1250, revenue: 7500.0, dispatch_revenue: 1250.0, ops_cost: 2100.0, battery_swap_cost: 945.0, repair_cost: 630.0, arrears_amount: 120.0, profit: 6650.0 },
    { id: 'mr2', month: '2026-03', area_id: 'area2', ride_count: 980, revenue: 5860.0, dispatch_revenue: 1000.0, ops_cost: 1800.0, battery_swap_cost: 810.0, repair_cost: 540.0, arrears_amount: 85.0, profit: 5060.0 },
    { id: 'mr3', month: '2026-03', area_id: 'area3', ride_count: 860, revenue: 5120.0, dispatch_revenue: 900.0, ops_cost: 1500.0, battery_swap_cost: 675.0, repair_cost: 450.0, arrears_amount: 60.0, profit: 4520.0 },
    { id: 'mr4', month: '2026-03', area_id: 'area4', ride_count: 720, revenue: 4290.0, dispatch_revenue: 750.0, ops_cost: 1200.0, battery_swap_cost: 540.0, repair_cost: 360.0, arrears_amount: 45.0, profit: 3840.0 },
    { id: 'mr5', month: '2026-03', area_id: 'area5', ride_count: 650, revenue: 3875.0, dispatch_revenue: 675.0, ops_cost: 1100.0, battery_swap_cost: 495.0, repair_cost: 330.0, arrears_amount: 35.0, profit: 3450.0 },
    { id: 'mr6', month: '2026-04', area_id: 'area1', ride_count: 1380, revenue: 8310.0, dispatch_revenue: 1350.0, ops_cost: 2300.0, battery_swap_cost: 1035.0, repair_cost: 690.0, arrears_amount: 105.0, profit: 7360.0 },
    { id: 'mr7', month: '2026-04', area_id: 'area2', ride_count: 1050, revenue: 6300.0, dispatch_revenue: 1050.0, ops_cost: 1950.0, battery_swap_cost: 877.5, repair_cost: 585.0, arrears_amount: 75.0, profit: 5400.0 },
    { id: 'mr8', month: '2026-04', area_id: 'area3', ride_count: 920, revenue: 5510.0, dispatch_revenue: 930.0, ops_cost: 1600.0, battery_swap_cost: 720.0, repair_cost: 480.0, arrears_amount: 55.0, profit: 4840.0 },
    { id: 'mr9', month: '2026-04', area_id: 'area4', ride_count: 800, revenue: 4800.0, dispatch_revenue: 800.0, ops_cost: 1350.0, battery_swap_cost: 607.5, repair_cost: 405.0, arrears_amount: 40.0, profit: 4250.0 },
    { id: 'mr10', month: '2026-04', area_id: 'area5', ride_count: 710, revenue: 4245.0, dispatch_revenue: 725.0, ops_cost: 1200.0, battery_swap_cost: 540.0, repair_cost: 360.0, arrears_amount: 30.0, profit: 3770.0 },
    { id: 'mr11', month: '2026-05', area_id: 'area1', ride_count: 1520, revenue: 9190.0, dispatch_revenue: 1450.0, ops_cost: 2500.0, battery_swap_cost: 1125.0, repair_cost: 750.0, arrears_amount: 95.0, profit: 8140.0 },
    { id: 'mr12', month: '2026-05', area_id: 'area2', ride_count: 1180, revenue: 7110.0, dispatch_revenue: 1150.0, ops_cost: 2100.0, battery_swap_cost: 945.0, repair_cost: 630.0, arrears_amount: 70.0, profit: 6160.0 },
    { id: 'mr13', month: '2026-05', area_id: 'area3', ride_count: 1010, revenue: 6090.0, dispatch_revenue: 980.0, ops_cost: 1750.0, battery_swap_cost: 787.5, repair_cost: 525.0, arrears_amount: 50.0, profit: 5320.0 },
    { id: 'mr14', month: '2026-05', area_id: 'area4', ride_count: 880, revenue: 5310.0, dispatch_revenue: 850.0, ops_cost: 1500.0, battery_swap_cost: 675.0, repair_cost: 450.0, arrears_amount: 38.0, profit: 4660.0 },
    { id: 'mr15', month: '2026-05', area_id: 'area5', ride_count: 780, revenue: 4710.0, dispatch_revenue: 750.0, ops_cost: 1350.0, battery_swap_cost: 607.5, repair_cost: 405.0, arrears_amount: 28.0, profit: 4110.0 },
  ]
  for (const r of reports) {
    d.run('INSERT INTO monthly_reports VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [r.id, r.month, r.area_id, r.ride_count, r.revenue, r.dispatch_revenue, r.ops_cost, r.battery_swap_cost, r.repair_cost, r.arrears_amount, r.profit])
  }
}

function seedTransactions(d: Database, now: string) {
  const transactions = [
    { id: 'tx1', user_id: 'u6', type: 'ride_fee', amount: -4.5, balance_after: 46.0, related_id: 'r1', description: '骑行扣费-BJ10001', status: 'completed' },
    { id: 'tx2', user_id: 'u7', type: 'ride_fee', amount: -3.5, balance_after: 28.5, related_id: 'r2', description: '骑行扣费-BJ10006', status: 'completed' },
    { id: 'tx3', user_id: 'u8', type: 'ride_fee', amount: -5.8, balance_after: 4.2, related_id: 'r3', description: '骑行扣费-BJ10011', status: 'completed' },
    { id: 'tx4', user_id: 'u8', type: 'dispatch_fee', amount: -15.0, balance_after: -10.8, related_id: 'r3', description: '围栏外还车调度费-BJ10011', status: 'arrears' },
    { id: 'tx5', user_id: 'u8', type: 'deposit_pay', amount: -199.0, balance_after: -10.8, related_id: null, description: '缴纳押金199元', status: 'completed' },
    { id: 'tx6', user_id: 'u9', type: 'ride_fee', amount: -3.0, balance_after: 22.8, related_id: 'r4', description: '骑行扣费-BJ10016', status: 'completed' },
    { id: 'tx7', user_id: 'u10', type: 'ride_fee', amount: -4.0, balance_after: 76.0, related_id: 'r5', description: '骑行扣费-BJ10021', status: 'completed' },
    { id: 'tx8', user_id: 'u6', type: 'topup', amount: 50.0, balance_after: 96.0, related_id: null, description: '余额充值50元', status: 'completed' },
  ]
  const times = [
    new Date(Date.now() - 6900000).toISOString(),
    new Date(Date.now() - 5100000).toISOString(),
    new Date(Date.now() - 3300000).toISOString(),
    new Date(Date.now() - 3300000).toISOString(),
    new Date(Date.now() - 86400000).toISOString(),
    new Date(Date.now() - 1500000).toISOString(),
    new Date(Date.now() - 600000).toISOString(),
    new Date(Date.now() - 86400000).toISOString(),
  ]
  for (let i = 0; i < transactions.length; i++) {
    const t = transactions[i]
    d.run('INSERT INTO transactions VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [t.id, t.user_id, t.type, t.amount, t.balance_after, t.related_id, t.description, t.status, times[i]])
  }
}
