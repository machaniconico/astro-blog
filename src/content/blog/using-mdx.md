---
title: 'Using MDX safely'
description: 'MDXのコード例を安全に掲載する方法'
pubDate: 'Jun 01 2024'
heroImage: '../../assets/blog-placeholder-5.jpg'
---

This theme supports MDX for components maintained in the site source. Posts written from the CMS are saved as regular Markdown so everyday editing stays simple and does not execute pasted JavaScript.

## Why MDX?

MDX is a flavor of Markdown that can mix components into an article. It is useful when a developer intentionally builds and reviews an interactive component in the repository.

For ordinary posts, use the CMS formatting tools, code blocks, photos, callouts, and collapsible sections. They provide rich presentation without adding executable code to an article.

## Safe example

Component syntax can still be shown to readers as a code example:

```mdx
import HeaderLink from '../../components/HeaderLink.astro';

<HeaderLink href="#">
  Embedded component example
</HeaderLink>
```

The fenced block above is displayed as text. It is not imported or executed by the published page.

## More links

- [MDX Syntax Documentation](https://mdxjs.com/docs/what-is-mdx)
- [Astro Usage Documentation](https://docs.astro.build/en/basics/astro-pages/#markdownmdx-pages)
- **Note:** Interactive components should be implemented and reviewed in the site source rather than pasted into a CMS article.
