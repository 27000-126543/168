import { useState, useEffect } from 'react'
import { Plus, Search, Edit2, X } from 'lucide-react'
import { useUserStore } from '@/stores/userStore'
import type { User, UserRole } from '@/types'

const roleLabels: Record<UserRole, string> = { user: '用户', ops: '运维', supervisor: '主管', admin: '管理员' }
const roleColors: Record<UserRole, string> = { user: 'bg-zinc-100 text-zinc-600', ops: 'bg-blue-100 text-blue-700', supervisor: 'bg-purple-100 text-purple-700', admin: 'bg-brand-100 text-brand-700' }

function UserForm({ user, onSave, onClose }: { user?: User; onSave: (data: any) => void; onClose: () => void }) {
  const [name, setName] = useState(user?.name || '')
  const [phone, setPhone] = useState(user?.phone || '')
  const [role, setRole] = useState<UserRole>(user?.role || 'ops')
  const [password, setPassword] = useState('')

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">{user ? '编辑用户' : '新增用户'}</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-zinc-400" /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-zinc-600 mb-1.5">姓名</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-2.5 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700" />
          </div>
          <div>
            <label className="block text-sm text-zinc-600 mb-1.5">手机号</label>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full px-4 py-2.5 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700" />
          </div>
          <div>
            <label className="block text-sm text-zinc-600 mb-1.5">角色</label>
            <select value={role} onChange={(e) => setRole(e.target.value as UserRole)} className="w-full px-4 py-2.5 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700">
              <option value="ops">运维人员</option>
              <option value="supervisor">区域主管</option>
              <option value="admin">管理员</option>
            </select>
          </div>
          {!user && (
            <div>
              <label className="block text-sm text-zinc-600 mb-1.5">初始密码</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-2.5 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700" />
            </div>
          )}
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 btn-outline">取消</button>
            <button onClick={() => onSave({ name, phone, role, password })} className="flex-1 btn-primary">保存</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Users() {
  const { users, fetchUsers, createUser, updateUser } = useUserStore()
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [showForm, setShowForm] = useState(false)
  const [editingUser, setEditingUser] = useState<User | undefined>()

  useEffect(() => { fetchUsers() }, [fetchUsers])

  const MOCK_USERS: User[] = [
    { id: '1', name: '张三', phone: '13800000001', role: 'user', creditScore: 95, balance: 50, deposit: 0, createdAt: '2026-01-15' },
    { id: '2', name: '李四', phone: '13800000002', role: 'ops', creditScore: 100, balance: 0, deposit: 0, createdAt: '2026-02-01' },
    { id: '3', name: '王五', phone: '13800000003', role: 'supervisor', creditScore: 100, balance: 0, deposit: 0, createdAt: '2026-01-01' },
    { id: '4', name: '赵六', phone: '13800000004', role: 'ops', creditScore: 100, balance: 0, deposit: 0, createdAt: '2026-03-10' },
    { id: '5', name: '陈七', phone: '13800000005', role: 'user', creditScore: 55, balance: 0, deposit: 199, createdAt: '2026-04-20' },
  ]

  const list = users.length > 0 ? users : MOCK_USERS
  const filtered = list.filter((u) => {
    const matchSearch = !search || u.name.includes(search) || u.phone?.includes(search)
    const matchRole = roleFilter === 'all' || u.role === roleFilter
    return matchSearch && matchRole
  })

  const handleSave = async (data: any) => {
    try {
      if (editingUser) {
        await updateUser(editingUser.id, data)
      } else {
        await createUser(data)
      }
      setShowForm(false)
      setEditingUser(undefined)
    } catch {}
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-zinc-900">用户管理</h1>
        <button onClick={() => { setEditingUser(undefined); setShowForm(true) }} className="btn-primary flex items-center gap-2"><Plus className="w-4 h-4" />新增用户</button>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center gap-2 bg-white border border-zinc-200 rounded-lg px-3 py-2 flex-1 max-w-xs">
          <Search className="w-4 h-4 text-zinc-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜索姓名或手机号" className="flex-1 text-sm outline-none" />
        </div>
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="px-3 py-2 border border-zinc-200 rounded-lg text-sm outline-none">
          <option value="all">全部角色</option>
          <option value="user">用户</option>
          <option value="ops">运维</option>
          <option value="supervisor">主管</option>
          <option value="admin">管理员</option>
        </select>
      </div>

      <div className="card overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-zinc-400 text-xs border-b border-zinc-100 bg-zinc-50">
              <th className="text-left px-5 py-3">姓名</th>
              <th className="text-left px-5 py-3">手机号</th>
              <th className="text-left px-5 py-3">角色</th>
              <th className="text-center px-5 py-3">信用分</th>
              <th className="text-center px-5 py-3">状态</th>
              <th className="text-center px-5 py-3">操作</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.id} className="border-b border-zinc-50 hover:bg-zinc-50">
                <td className="px-5 py-3 font-medium text-zinc-900">{u.name}</td>
                <td className="px-5 py-3 number-font text-zinc-600">{u.phone}</td>
                <td className="px-5 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${roleColors[u.role]}`}>{roleLabels[u.role]}</span></td>
                <td className="text-center px-5 py-3">
                  <span className={`number-font font-medium ${u.creditScore >= 80 ? 'text-green-600' : u.creditScore >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>{u.creditScore}</span>
                </td>
                <td className="text-center px-5 py-3"><span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">正常</span></td>
                <td className="text-center px-5 py-3">
                  <button onClick={() => { setEditingUser(u); setShowForm(true) }} className="p-1.5 rounded-lg hover:bg-zinc-100"><Edit2 className="w-4 h-4 text-zinc-400" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showForm && <UserForm user={editingUser} onSave={handleSave} onClose={() => { setShowForm(false); setEditingUser(undefined) }} />}
    </div>
  )
}
