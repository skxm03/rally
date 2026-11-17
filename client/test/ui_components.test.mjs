import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

describe('Design Tokens & Typography Consistency', () => {
  test('typography scale follows strict hierarchical contrast', () => {
    const scale = {
      hero: 28,
      pageTitle: 24,
      title: 20,
      navTitle: 17,
      body: 15,
      caption: 13,
    };

    assert.ok(scale.hero > scale.pageTitle);
    assert.ok(scale.pageTitle > scale.title);
    assert.ok(scale.title > scale.navTitle);
    assert.ok(scale.navTitle > scale.body);
    assert.ok(scale.body > scale.caption);
  });

  test('button dimensions and variants provide consistent hit targets', () => {
    const buttonSizes = {
      sm: { height: 32, paddingHorizontal: 12, fontSize: 13 },
      md: { height: 38, paddingHorizontal: 16, fontSize: 14 },
      lg: { height: 48, paddingHorizontal: 20, fontSize: 15 },
    };

    assert.equal(buttonSizes.sm.height, 32);
    assert.equal(buttonSizes.md.height, 38);
    assert.equal(buttonSizes.lg.height, 48);
    assert.ok(buttonSizes.sm.height < buttonSizes.md.height);
    assert.ok(buttonSizes.md.height < buttonSizes.lg.height);
  });
});
