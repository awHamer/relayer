import { sql } from 'drizzle-orm';
import { createRelayerDrizzle } from '@relayerjs/drizzle';

import { client, db } from './db';
import * as schema from './schema';
import { seed } from './seed';

const log = (label: string, data: unknown) =>
  console.log(`\n=== ${label} ===\n`, JSON.stringify(data, null, 2));

async function main() {
  await seed();

  // Clean up categories and post_categories for a fresh start
  await db.execute(sql`DELETE FROM post_categories`);
  await db.execute(sql`DELETE FROM categories`);
  await db.execute(sql`ALTER SEQUENCE categories_id_seq RESTART WITH 1`);
  await db.execute(sql`ALTER SEQUENCE post_categories_id_seq RESTART WITH 1`);

  const r = createRelayerDrizzle({ db, schema });

  // Create test categories
  const cat1 = await r.categories.create({ data: { name: 'TypeScript' } });
  const cat2 = await r.categories.create({ data: { name: 'JavaScript' } });
  const cat3 = await r.categories.create({ data: { name: 'Rust' } });
  log('Created categories', [cat1, cat2, cat3]);

  // 1. one() connect: reassign post author
  log(
    'Before: post 1 author',
    await r.posts.findFirst({ select: { id: true, authorId: true }, where: { id: 1 } }),
  );

  await r.posts.update({
    where: { id: 1 },
    data: { author: { connect: 2 } },
  });
  log(
    'After connect author=2',
    await r.posts.findFirst({ select: { id: true, authorId: true }, where: { id: 1 } }),
  );

  // Restore
  await r.posts.update({ where: { id: 1 }, data: { author: { connect: 1 } } });

  // 2. many() connect: link categories to post via join table
  await r.posts.update({
    where: { id: 1 },
    data: {
      postCategories: { connect: [cat1.id, cat2.id] },
    },
  });
  log('After connect categories [1,2]', await r.postCategories.findMany({ where: { postId: 1 } }));

  // 3. many() connect with _id + extra fields (isPrimary)
  await r.posts.update({
    where: { id: 2 },
    data: {
      postCategories: {
        connect: [
          { _id: cat1.id, isPrimary: true },
          { _id: cat3.id, isPrimary: false },
        ],
      },
    },
  });
  log('After connect with isPrimary', await r.postCategories.findMany({ where: { postId: 2 } }));

  // 4. many() disconnect: remove one category from post 1
  await r.posts.update({
    where: { id: 1 },
    data: {
      postCategories: { disconnect: [cat2.id] },
    },
  });
  log(
    'After disconnect cat2 from post 1',
    await r.postCategories.findMany({ where: { postId: 1 } }),
  );

  // 5. many() set: replace all categories on post 1
  await r.posts.update({
    where: { id: 1 },
    data: {
      postCategories: { set: [cat3.id] },
    },
  });
  log('After set [cat3] on post 1', await r.postCategories.findMany({ where: { postId: 1 } }));

  // 6. many() connect + disconnect in one call
  await r.posts.update({
    where: { id: 2 },
    data: {
      postCategories: {
        connect: [cat2.id],
        disconnect: [cat1.id],
      },
    },
  });
  log(
    'After connect cat2 + disconnect cat1 on post 2',
    await r.postCategories.findMany({ where: { postId: 2 } }),
  );

  // 7. Mixed: scalar + one() connect + many() connect
  await r.posts.update({
    where: { id: 3 },
    data: {
      title: 'Updated with relations',
      author: { connect: 3 },
      postCategories: { connect: [cat1.id, cat2.id, cat3.id] },
    },
  });
  const post3 = await r.posts.findFirst({
    select: { id: true, title: true, authorId: true },
    where: { id: 3 },
  });
  const post3Cats = await r.postCategories.findMany({ where: { postId: 3 } });
  log('Mixed update post 3', { post: post3, categories: post3Cats });

  // 8. Transaction rollback test: scalar update + bad connect should rollback both
  const titleBefore = (await r.posts.findFirst({ select: { title: true }, where: { id: 1 } }))!
    .title;
  log('Before rollback test, post 1 title', titleBefore);

  try {
    await r.posts.update({
      where: { id: 1 },
      data: {
        title: 'Should rollback',
        postCategories: { connect: [999] }, // FK violation -> error
      },
    });
  } catch (e) {
    console.log('\nExpected error:', (e as Error).message?.slice(0, 80));
  }

  const titleAfter = (await r.posts.findFirst({ select: { title: true }, where: { id: 1 } }))!
    .title;
  log('After rollback test, post 1 title', titleAfter);
  console.log(
    titleAfter === titleBefore
      ? '>>> TRANSACTION WORKS: title unchanged after error'
      : '>>> TRANSACTION BROKEN: title was changed despite error!',
  );

  // 9. Parent transaction: everything rolls back together
  const titleBeforeParentTx = (await r.posts.findFirst({
    select: { title: true },
    where: { id: 2 },
  }))!.title;
  log('Before parent tx test, post 2 title', titleBeforeParentTx);

  try {
    await r.$transaction(async (tx) => {
      // This should succeed inside tx
      await tx.posts.update({
        where: { id: 2 },
        data: {
          title: 'Inside parent tx',
          postCategories: { set: [cat1.id] },
        },
      });

      // Verify inside tx — should see the change
      const inside = await tx.posts.findFirst({ select: { title: true }, where: { id: 2 } });
      console.log('\nInside parent tx, post 2 title:', inside!.title);

      // Now throw to force rollback of everything
      throw new Error('Force parent tx rollback');
    });
  } catch (e) {
    console.log('Expected error:', (e as Error).message);
  }

  const titleAfterParentTx = (await r.posts.findFirst({
    select: { title: true },
    where: { id: 2 },
  }))!.title;
  const catsAfterParentTx = await r.postCategories.findMany({ where: { postId: 2 } });
  log('After parent tx rollback, post 2 title', titleAfterParentTx);
  log('After parent tx rollback, post 2 categories', catsAfterParentTx);
  console.log(
    titleAfterParentTx === titleBeforeParentTx
      ? '>>> PARENT TX WORKS: title + categories unchanged after rollback'
      : '>>> PARENT TX BROKEN: changes persisted despite rollback!',
  );

  await client.end();
  console.log('\nRelations example complete!');
}

main().catch(console.error);
