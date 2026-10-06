import prisma from "./prisma";
import { BadRequest } from "./validate";

/**
 * Every account and category a transaction (or budget line) points to must belong to the same user, or one
 * user could attach records to another user's accounts and categories by id.
 */
export async function assertOwnRefs(
  userId: string,
  refs: { categoryId?: string | null; toCategoryId?: string | null; fromAccountId?: string | null; toAccountId?: string | null }
) {
  const accountIds = [...new Set([refs.fromAccountId, refs.toAccountId].filter((x): x is string => !!x))];
  const categoryIds = [...new Set([refs.categoryId, refs.toCategoryId].filter((x): x is string => !!x))];
  const [accounts, categories] = await Promise.all([
    accountIds.length ? prisma.account.count({ where: { id: { in: accountIds }, userId } }) : 0,
    categoryIds.length ? prisma.category.count({ where: { id: { in: categoryIds }, userId } }) : 0,
  ]);
  if (accounts !== accountIds.length) throw new BadRequest("Account not found");
  if (categories !== categoryIds.length) throw new BadRequest("Category not found");
}
