// TODO: 后续替换为 /api/v1/moments 接口

export interface Moment {
  id: number
  name: string
  /** 文字头像的渐变底色 */
  avatarColor: string
  content: string
  /** 可选配图，1~3 张 */
  images?: string[]
  /** 相对时间，如「3 小时前」 */
  createdAt: string
}

export const mockMoments: Moment[] = [
  {
    id: 1,
    name: '山月',
    avatarColor: 'linear-gradient(135deg, #e56f43, #f0a868)',
    content: '傍晚沿河走了很久，风把云吹得很薄。回来时路灯次第亮起，忽然觉得这样的日子也很好。',
    images: [
      'https://picsum.photos/seed/moment-1a/600/400',
      'https://picsum.photos/seed/moment-1b/600/400',
    ],
    createdAt: '3 小时前',
  },
  {
    id: 2,
    name: '青梧',
    avatarColor: 'linear-gradient(135deg, #7ba05b, #b5cf94)',
    content: '把阳台上蔫掉的薄荷救活了，浇了水，第二天就挺直了腰。植物比人容易满足得多。',
    createdAt: '昨天',
  },
  {
    id: 3,
    name: '拾贝',
    avatarColor: 'linear-gradient(135deg, #4a7fb5, #8fb8d8)',
    content: '重读《城南旧事》，冬阳下的骆驼队又走了一遍。有些书是要隔几年再见一次的。',
    images: ['https://picsum.photos/seed/moment-3/600/400'],
    createdAt: '2 天前',
  },
  {
    id: 4,
    name: '阿澈',
    avatarColor: 'linear-gradient(135deg, #9a6bb5, #cba8dd)',
    content: '周末去了趟旧书店，淘到一本 1987 年的诗集，扉页上还有前一位主人的签名和日期。',
    images: [
      'https://picsum.photos/seed/moment-4a/600/400',
      'https://picsum.photos/seed/moment-4b/600/400',
      'https://picsum.photos/seed/moment-4c/600/400',
    ],
    createdAt: '3 天前',
  },
  {
    id: 5,
    name: '南枝',
    avatarColor: 'linear-gradient(135deg, #cd5f5f, #e89a9a)',
    content: '煮了一锅新米粥，什么也不放，米香就够了。简单的东西往往最经得住尝。',
    createdAt: '5 天前',
  },
  {
    id: 6,
    name: '远山',
    avatarColor: 'linear-gradient(135deg, #b07a1e, #dcb26a)',
    content: '夜里下了今年第一场雪，早上推窗，屋顶全白了。狗在院子里踩出一串梅花印。',
    images: ['https://picsum.photos/seed/moment-6/600/400'],
    createdAt: '1 周前',
  },
  {
    id: 7,
    name: '白露',
    avatarColor: 'linear-gradient(135deg, #5ba39a, #96cec6)',
    content: '把去年的日记翻出来看，当时觉得天大的事，如今都轻描淡写。时间果然是好东西。',
    createdAt: '2 周前',
  },
]
