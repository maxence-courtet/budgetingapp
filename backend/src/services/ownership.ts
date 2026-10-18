import prisma from "./prisma";
import { BadRequest } from "./validate";

const ids = (xs: (string | null | undefined)[]) => [...new Set(xs.filter((x): x is string => !!x))];

/** All of these accounts and categories must belong to the user. */
export async function assertOwnIds(userId: string, accountIds: (string | null | undefined)[], categoryIds: (string | null | undefined)[]) {
  const accounts = ids(accountIds);
  const categories = ids(categoryIds);
  const [ownedAccounts, ownedCategories] = await Promise.all([
    accounts.length ? prisma.account.count({ where: { id: { in: accounts }, userId } }) : 0,
    categories.length ? prisma.category.count({ where: { id: { in: categories }, userId } }) : 0,
  ]);
  if (ownedAccounts !== accounts.length) throw new BadRequest("Account not found");
  if (ownedCategories !== categories.length) throw new BadRequest("Category not found");
}

/**
 * Every account and category a transaction (or budget line) points to must belong to the same user, or one
 * user could attach records to another user's accounts and categories by id.
 */
export async function assertOwnRefs(
  userId: string,
  refs: { categoryId?: string | null; toCategoryId?: string | null; fromAccountId?: string | null; toAccountId?: string | null }
) {
  await assertOwnIds(userId, [refs.fromAccountId, refs.toAccountId], [refs.categoryId, refs.toCategoryId]);
}
