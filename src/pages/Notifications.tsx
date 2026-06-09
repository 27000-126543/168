import { useState, useEffect } from 'react'
import { Bike, MapPin, AlertTriangle, Truck, Bell, Download, CheckCheck } from 'lucide-react'
import { useNotificationStore } from '@/stores/notificationStore'
import type { Notification, NotificationType } from '@/types'

const typeConfig: Record<NotificationType, { icon: typeof Bike; color: string; label: string }> = {
  unlock: { icon: Bike, color: 'text-green-600 bg-green-50', label: '开锁通知' },
  return: { icon: MapPin, color: 'text-blue-600 bg-blue-50', label: '还车通知' },
  fault: { icon: AlertTriangle, color: 'text-accent-600 bg-orange-50', label: '故障通知' },
  dispatch: { icon: Truck, color: 'text-purple-600 bg-purple-50', label: '调度通知' },
  system: { icon: Bell, color: 'text-zinc-600 bg-zinc-50', label: '系统通知' },
}

const MOCK_NOTIFICATIONS: Notification[] = [
  { id: '1', userId: 'u1', type: 'unlock', title: '车辆已解锁', content: '您已成功解锁 EB-0012，请文明骑行，注意安全。起步价 ¥2.00，时长费 ¥1.00/min。', read: false, createdAt: '2026-06-09 10:30', relatedId: 'r1' },
  { id: '2', userId: 'u1', type: 'return', title: '还车成功', content: '您已成功还车 EB-0034。骑行时长 30分钟，距离 2.8km，费用 ¥4.00。因在围栏外还车，加收调度费 ¥5.00，扣除信用分 5分。', read: false, createdAt: '2026-06-08 15:10', relatedId: 'r2', voucherUrl: '#' },
  { id: '3', userId: 'u1', type: 'fault', title: '故障举报已受理', content: '您举报的 EB-0078 刹车故障已派单给运维人员，预计2小时内处理。', read: true, createdAt: '2026-06-07 14:20', relatedId: 't1' },
  { id: '4', userId: 'u1', type: 'dispatch', title: '车辆调度通知', content: '您附近的 EB-0090 已调度至朝阳大悦城停车点，可在5分钟后使用。', read: true, createdAt: '2026-06-06 09:00' },
  { id: '5', userId: 'u1', type: 'system', title: '信用分变动', content: '因围栏外还车，您的信用分由 100 扣减至 95 分。请文明骑行，避免信用分降低。', read: true, createdAt: '2026-06-05 18:30' },
  { id: '6', userId: 'u1', type: 'unlock', title: '车辆已解锁', content: '您已成功解锁 EB-0056，祝您骑行愉快。', read: true, createdAt: '2026-06-05 18:00', relatedId: 'r3' },
]

export default function Notifications() {
  const { notifications, fetchNotifications, markAsRead, unreadCount } = useNotificationStore()
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => { fetchNotifications() }, [fetchNotifications])

  const list = notifications.length > 0 ? notifications : MOCK_NOTIFICATIONS
  const selected = list.find((n) => n.id === selectedId)

  const handleSelect = async (id: string) => {
    setSelectedId(id)
    const notification = list.find((n) => n.id === id)
    if (notification && !notification.read) {
      await markAsRead(id)
    }
  }

  const markAllRead = async () => {
    for (const n of list.filter((n) => !n.read)) {
      await markAsRead(n.id)
    }
  }

  return (
    <div className="h-screen flex bg-zinc-50">
      <div className="w-96 border-r border-zinc-200 bg-white flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100">
          <div>
            <h2 className="font-bold text-zinc-900">消息中心</h2>
            <p className="text-xs text-zinc-400">{unreadCount > 0 ? `${unreadCount} 条未读` : '全部已读'}</p>
          </div>
          {unreadCount > 0 && (
            <button onClick={markAllRead} className="text-xs text-brand-700 flex items-center gap-1 hover:underline">
              <CheckCheck className="w-3 h-3" />全部已读
            </button>
          )}
        </div>
        <div className="flex-1 overflow-y-auto">
          {list.map((n) => {
            const config = typeConfig[n.type]
            const Icon = config.icon
            return (
              <div key={n.id} onClick={() => handleSelect(n.id)} className={`flex items-start gap-3 px-4 py-3 cursor-pointer border-b border-zinc-50 hover:bg-zinc-50 ${selectedId === n.id ? 'bg-brand-50' : ''} ${!n.read ? 'bg-brand-50/30' : ''}`}>
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${config.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium truncate ${!n.read ? 'text-zinc-900' : 'text-zinc-600'}`}>{n.title}</span>
                    {!n.read && <span className="w-2 h-2 rounded-full bg-brand-700 flex-shrink-0" />}
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5 truncate">{n.content}</p>
                  <p className="text-[10px] text-zinc-300 mt-1 number-font">{n.createdAt}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="flex-1 p-6">
        {selected ? (
          <div className="card max-w-2xl mx-auto">
            <div className="flex items-center gap-3 mb-4">
              {(() => {
                const config = typeConfig[selected.type]
                const Icon = config.icon
                return (
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${config.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                )
              })()}
              <div>
                <h2 className="font-bold text-zinc-900">{selected.title}</h2>
                <p className="text-xs text-zinc-400 number-font">{selected.createdAt}</p>
              </div>
            </div>
            <p className="text-sm text-zinc-600 leading-relaxed mb-6">{selected.content}</p>
            {selected.voucherUrl && (
              <button className="btn-outline flex items-center gap-2">
                <Download className="w-4 h-4" />下载凭证
              </button>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-zinc-400">
            <div className="text-center">
              <Bell className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>选择一条消息查看详情</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
