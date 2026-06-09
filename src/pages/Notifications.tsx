import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bike, MapPin, AlertTriangle, Truck, Bell, Download, CheckCheck, FileText, BarChart3, CheckCircle, Clock } from 'lucide-react'
import { useNotificationStore } from '@/stores/notificationStore'
import { useAuthStore } from '@/stores/authStore'
import type { Notification, NotificationType } from '@/types'

const typeConfig: Record<NotificationType, { icon: typeof Bike; color: string; label: string }> = {
  unlock: { icon: Bike, color: 'text-green-600 bg-green-50', label: '开锁通知' },
  return: { icon: MapPin, color: 'text-blue-600 bg-blue-50', label: '还车通知' },
  fault: { icon: AlertTriangle, color: 'text-accent-600 bg-orange-50', label: '故障通知' },
  dispatch: { icon: Truck, color: 'text-purple-600 bg-purple-50', label: '调度通知' },
  system: { icon: Bell, color: 'text-zinc-600 bg-zinc-50', label: '系统通知' },
}

function getOvertimeTag(title: string) {
  if (title.includes('[已处理]')) return { label: '已处理', color: 'bg-green-50 text-green-600', icon: CheckCircle }
  if (title.includes('[紧急]')) return { label: '紧急超时', color: 'bg-red-50 text-red-600', icon: AlertTriangle }
  if (title.includes('[严重]')) return { label: '严重超时', color: 'bg-orange-50 text-orange-600', icon: AlertTriangle }
  if (title.includes('[超时]')) return { label: '超时', color: 'bg-yellow-50 text-yellow-600', icon: Clock }
  return null
}

function downloadVoucher(notification: Notification) {
  const content = `=== 凭证 ===\n类型: ${typeConfig[notification.type]?.label || notification.type}\n标题: ${notification.title}\n时间: ${notification.createdAt}\n\n${notification.content}\n\n关联ID: ${notification.relatedId || '无'}\n生成时间: ${new Date().toLocaleString('zh-CN')}`
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `凭证_${notification.type}_${notification.createdAt.replace(/[:\s]/g, '_')}.txt`
  a.click()
  URL.revokeObjectURL(url)
}

export default function Notifications() {
  const { notifications, fetchNotifications, markAsRead, unreadCount } = useNotificationStore()
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => { fetchNotifications() }, [fetchNotifications])

  const list = notifications.length > 0 ? notifications : []
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

  const hasVoucher = (n: Notification) => ['unlock', 'return', 'dispatch', 'fault'].includes(n.type) && n.relatedId
  const isReportNotification = (n: Notification) => n.type === 'system' && n.title?.includes('运营报告') && n.relatedId

  return (
    <div className="h-screen flex bg-zinc-50">
      <div className="w-96 border-r border-zinc-200 bg-white flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100">
          <div>
            <h2 className="font-bold text-zinc-900">消息中心</h2>
            <p className="text-xs text-zinc-400">{unreadCount > 0 ? `${list.filter(n => !n.read).length} 条未读` : '全部已读'}</p>
          </div>
          {list.some(n => !n.read) && (
            <button onClick={markAllRead} className="text-xs text-brand-700 flex items-center gap-1 hover:underline">
              <CheckCheck className="w-3 h-3" />全部已读
            </button>
          )}
        </div>
        <div className="flex-1 overflow-y-auto">
          {list.length === 0 && (
            <div className="flex flex-col items-center justify-center h-48 text-zinc-400">
              <Bell className="w-8 h-8 mb-2 opacity-30" />
              <p className="text-sm">暂无消息</p>
            </div>
          )}
          {list.map((n) => {
            const config = typeConfig[n.type]
            const Icon = config?.icon || Bell
            const overtimeTag = getOvertimeTag(n.title)
            const isResolved = n.title.includes('[已处理]')
            return (
              <div key={n.id} onClick={() => handleSelect(n.id)} className={`flex items-start gap-3 px-4 py-3 cursor-pointer border-b border-zinc-50 hover:bg-zinc-50 ${selectedId === n.id ? 'bg-brand-50' : ''} ${!n.read ? 'bg-brand-50/30' : ''} ${isResolved ? 'opacity-60' : ''}`}>
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${config?.color || 'text-zinc-600 bg-zinc-50'}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium truncate ${!n.read ? 'text-zinc-900' : 'text-zinc-600'}`}>{n.title.replace(/\[超时\]\[\w+\]\s*/, '').replace(/\[已处理\]\[\w+\]\s*/, '')}</span>
                    {overtimeTag && (
                      <span className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium ${overtimeTag.color} flex items-center gap-0.5`}>
                        <overtimeTag.icon className="w-2.5 h-2.5" />{overtimeTag.label}
                      </span>
                    )}
                    {!n.read && !isResolved && <span className="w-2 h-2 rounded-full bg-brand-700 flex-shrink-0" />}
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
                const Icon = config?.icon || Bell
                const overtimeTag = getOvertimeTag(selected.title)
                return (
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${config?.color || 'text-zinc-600 bg-zinc-50'}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                )
              })()}
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-bold text-zinc-900">{selected.title.replace(/\[超时\]\[\w+\]\s*/, '').replace(/\[已处理\]\[\w+\]\s*/, '')}</h2>
                  {getOvertimeTag(selected.title) && (() => {
                    const tag = getOvertimeTag(selected.title)!
                    return <span className={`px-2 py-0.5 rounded text-xs font-medium ${tag.color} flex items-center gap-1`}><tag.icon className="w-3 h-3" />{tag.label}</span>
                  })()}
                </div>
                <p className="text-xs text-zinc-400 number-font">{selected.createdAt}</p>
              </div>
            </div>
            <p className="text-sm text-zinc-600 leading-relaxed mb-4 whitespace-pre-wrap">{selected.content}</p>
            {selected.relatedId && (
              <div className="bg-zinc-50 rounded-lg p-3 mb-4 flex items-center gap-2 text-xs text-zinc-500">
                <FileText className="w-3.5 h-3.5" />
                <span>关联ID: {selected.relatedId}</span>
              </div>
            )}
            {hasVoucher(selected) && (
              <button onClick={() => downloadVoucher(selected)} className="btn-outline flex items-center gap-2">
                <Download className="w-4 h-4" />下载凭证
              </button>
            )}
            {isReportNotification(selected) && (
              <button onClick={() => {
                const role = user?.role
                if (role === 'admin') navigate('/admin/reports')
                else if (role === 'supervisor') navigate('/supervisor/dispatch')
              }} className="btn-primary flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />查看报告
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
