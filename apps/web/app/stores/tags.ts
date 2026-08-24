import type { Tag, TagInput } from '#shared/types'
import { createCrudStore } from './createCrudStore'

/** 标签管理（接口含全部标签） */
export const useTagsStore = createCrudStore<Tag, TagInput>('admin-tags', '/api/admin/tags')
