import type { Category, CategoryInput } from '#shared/types'
import { createCrudStore } from './createCrudStore'

/** 分类管理（接口含全部分类） */
export const useCategoriesStore = createCrudStore<Category, CategoryInput>('admin-categories', '/api/admin/categories')
