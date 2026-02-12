/**
 * @file utils.ts
 * @description 工具函数库，提供常用的辅助函数
 * @exports cn - 合并 Tailwind 类名（支持条件类名）
 */
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
