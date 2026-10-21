You are a senior full-stack engineer and product designer. Implement a complete admin CMS for my existing flower shop website, similar in scope to archflowers.com.

The goal is to let a nontechnical administrator manage the website’s business content, products, images, page sections, navigation, and appearance without editing source code.

Every implemented setting must connect to the real public website and persist in the backend. Deliver a working implementation with authentication, database persistence, media management, preview, and publishing.

1. Inspect the existing application first

Identify the current framework, database, authentication, storage, routes, reusable components, and theme configuration.

Inventory the public pages and identify their hardcoded content. Map each editable element to an appropriate CMS field or content entity.

Reuse the existing architecture and design system. Preserve the current brand name, content, images, URLs, and working features. Use Arch Flowers as a reference for functionality; do not replace our business information with theirs.

If backend capabilities are missing, implement the minimum complete backend needed using conventions compatible with the project.

Make reasonable implementation decisions and proceed through the work. Ask questions only when a missing business decision genuinely blocks implementation.

2. Create a clear admin workspace

Provide a protected `/admin` area with these navigation groups:

- Overview
- Pages
- Products
- Categories and Collections
- Media
- Navigation and Footer
- Promotions
- Testimonials and FAQs
- Appearance
- Business Settings
- Users and Permissions
- Activity History

Use Vietnamese for user-facing admin labels and helpful instructions. Keep code identifiers in English.

The interface should have a consistent sidebar, page titles, breadcrumbs, search, filters, pagination, visible status badges, and clear primary actions.

The overview should show useful real information: published products, drafts, unpublished page changes, active promotions, and recent activity. Include shortcuts for editing the homepage, adding a product, and uploading images.

Show sales or traffic analytics only when real data sources already exist.

3. Make global business content editable

Provide grouped forms for:

- Business name, tagline, logo, alternate logo, and favicon.
- Phone, email, Zalo URL, social profiles, address, map URL, and opening hours.
- Header announcement text, link, visibility, and optional start/end dates.
- Default contact button labels and destinations.
- Footer description, contact details, copyright text, and policy links.
- Default SEO title, description, and social sharing image.

Reuse shared values throughout the storefront. Updating the business phone number must update every component that references the shared phone setting.

Validate links and required fields. Hide optional empty fields cleanly.

4. Build a structured page editor

Administrators must be able to create and edit standard content pages, including About, Contact, FAQs, delivery information, care instructions, and store policies.

Each page should support a title, unique slug, content sections, publication status, navigation visibility, and SEO settings.

For the homepage and other composed pages, provide a section editor using reusable components already consistent with the storefront.

Supported section types should include:

- Hero banner.
- Benefits or service promises.
- Category or occasion cards.
- Featured collections.
- Featured products.
- Shopping by budget.
- Image and text.
- Testimonials.
- Delivery information.
- Custom bouquet or consultation call to action.
- Brand story.
- FAQ accordion.
- Promotional banner.

Allow administrators to add, edit, duplicate, reorder, hide, and remove sections. Include keyboard-accessible ordering controls alongside drag-and-drop.

Expose only fields relevant to the selected section. Typical fields include heading, description, images, button labels, destinations, selected products or collections, and approved layout variants.

Use dedicated product and collection selectors rather than asking administrators to enter IDs.

Keep sections within a defined component system so administrators can change content and composition while preserving responsive layouts.

5. Implement product management

Provide searchable product lists with filters for status, category, collection, and availability.

Each product should support:

- Name, unique slug, and product code or SKU.
- Short description and detailed description.
- Ordered image gallery with a cover image.
- Categories, occasions, flower types, colors, and tags.
- Product variants such as size or arrangement option.
- Price, optional comparison price, and availability per variant.
- Optional care notes, customization notes, and substitution policy.
- Related products and merchandising badges.
- Draft, published, and archived states.
- SEO title, description, and sharing image.

Use integer VND amounts and consistent Vietnamese currency formatting.

For products with variants, calculate the displayed “from” price from eligible purchasable variants. Calculate discount badges from valid current and comparison prices. Reject negative prices and comparison prices below the current selling price.

Separate publication status from availability: a published product can remain visible while unavailable.

Allow product duplication and bulk actions for publication status, availability, and category assignment.

Product cards, detail pages, collection listings, and homepage sections must use the same authoritative product data.

6. Implement categories, collections, and catalog configuration

Let administrators create, edit, reorder, and archive categories and collections.

Each should support a name, slug, description, cover image, visibility, SEO settings, and associated products.

Support manually curated collections with drag-and-drop product ordering. If automatic collections are implemented, provide explicit rules based on existing product attributes and show matching products before saving.

Make catalog filter visibility, default sorting, and budget ranges configurable.

Renaming or archiving a category must not delete its products. Warn about active navigation or page references before removing referenced content.

7. Build reusable media management

Provide upload, search, selection, replacement, and deletion workflows.

Store image metadata including filename, dimensions, file size, alt text, and usage references.

Support image previews, gallery ordering, and focal-point selection where cropping is used. Allow separate mobile and desktop hero images when needed.

Validate file types and sizes on the server. Optimize public images while preserving originals where practical.

Show where an asset is used. Block deletion of referenced assets until the administrator replaces or removes those references.

Use the existing storage provider when available. Store durable references in the database.

8. Make navigation and footer configurable

Provide an editor for header menus, mobile menus, and footer link groups.

Allow administrators to change labels, ordering, nesting within supported layouts, and visibility.

Link targets should support internal pages, products, collections, approved anchors, and validated external URLs.

Prefer references to internal entities so links continue working after a slug change. Create redirects for previously published URLs when their slugs change.

Ensure menus remain usable on mobile and with keyboard navigation.

9. Add controlled appearance settings

Reuse the existing theme configuration as the starting point.

Expose appropriate settings for brand colors, backgrounds, text colors, approved fonts, button styles, corner radius, content width, section spacing, and product card presentation.

Use constrained options and sensible ranges. Validate contrast and prevent settings that make content unreadable.

Provide desktop and mobile previews, a reset-to-default action, and a publish workflow for appearance changes.

Do not expose arbitrary JavaScript or unrestricted HTML/CSS injection. New component types can require development; existing component content and supported visual options should be manageable through the CMS.

10. Manage promotions, testimonials, and FAQs

Promotions should support a title, image, message, destination, placement, visibility, priority, and optional start/end dates.

Use Asia/Ho_Chi_Minh for administrator-facing schedules and store timestamps consistently. Define deterministic behavior for overlapping promotions and ensure expired campaigns disappear without requiring an administrator to open the dashboard.

Testimonials should support customer display name, quote, optional rating, source label, source URL, ordering, and publication status.

Do not invent testimonials, review counts, or verification claims. Distinguish manually maintained content from any connected external review source.

FAQs should support categories, question, answer, ordering, and publication status.

11. Configure delivery and contact behavior

Provide settings for service areas, delivery descriptions, fees, free-delivery conditions, lead times, cutoff times, available delivery windows, and holiday exceptions.

Clearly distinguish informational copy from rules enforced by an existing order flow. If checkout or order submission already exists, connect applicable delivery settings to its server-side validation.

Provide configuration for Zalo, phone, and custom-order buttons. Product inquiry messages should include the selected product’s name, variant, and URL where the destination supports it.

Preserve the existing ordering model. This CMS task does not require adding a new payment gateway, ERP, or customer account system.

12. Implement reliable draft, preview, and publishing behavior

Support draft editing separately from published content for pages, products, global settings, and appearance.

Use clear “Save draft,” “Preview,” and “Publish” actions. Saving a draft must not change the live site.

Preview should use the actual storefront rendering components and support desktop and mobile widths. Protect unpublished content from public access and indexing.

Before publishing, validate required content, links, and dependencies. Flag references to unpublished products or missing media.

Publishing should update the public site consistently and invalidate relevant caches. Failed publication must leave the previous live version intact.

Record revision history with actor, timestamp, and changes. Allow restoration of a previous revision into a draft for review.

Prevent silent overwriting when two administrators edit the same record. Show a useful conflict message.

13. Implement authentication and permissions

Use the existing authentication system where possible.

Provide these roles:

- Owner: full access, including users and sensitive configuration.
- Administrator: manage and publish business content and site configuration, excluding owner-only controls.
- Editor: manage content and media drafts, without publishing or managing users.

Enforce permissions on the server for every relevant action.

Provide a secure initial-owner setup process without hardcoded credentials.

Validate API inputs, sanitize rich text, secure uploads, and use appropriate session and request protections.

Keep secrets in server-side configuration. Public settings endpoints must expose only explicitly allowed published fields.

Record important changes, publications, restorations, and permission changes in activity history.

14. Connect the CMS to the public website

Replace hardcoded business content with persisted CMS data while preserving the current storefront design.

Use structured records for products, variants, categories, media, and users. Use validated schemas for flexible page-section content.

Keep published queries separate from draft queries. Public APIs and rendered pages must not leak drafts.

Seed the CMS from existing application content so migration preserves the current site. Make seed scripts safe to rerun.

Handle missing optional content gracefully. Hidden sections should not leave empty spacing. Empty collections should have a deliberate empty state.

Use the existing server rendering or static regeneration approach when applicable so public content and metadata remain indexable.

15. Make everyday editing comfortable

Use clear field labels, examples, inline validation, image previews, visible save status, unsaved-change protection, and confirmation for destructive actions.

Keep primary editing fields prominent. Put less frequent options such as SEO and advanced appearance settings in secondary panels.

Provide complete loading, success, empty, and error states. Failed saves must preserve entered content.

Ensure the admin works on desktop and tablet, with essential edits usable on mobile.

16. Verify and deliver the complete implementation

Test these real workflows:

- Editing the homepage hero, previewing it, and publishing it.
- Confirming an unpublished draft never changes the public page.
- Reordering or hiding a section.
- Creating a product with multiple sizes and checking displayed prices.
- Adding a product to a featured collection.
- Changing the shared phone or Zalo contact.
- Updating a menu and changing a published slug.
- Replacing an image and preventing deletion while it is referenced.
- Starting and expiring a scheduled promotion.
- Confirming an Editor cannot publish through either the UI or API.
- Restoring an earlier revision.
- Detecting concurrent edit conflicts.
- Confirming published changes appear despite caching.

Use focused tests for permissions, publishing isolation, pricing, and critical data rules, plus browser verification of the main editing flows.

Deliver the implementation, database migrations, safe seed scripts, configuration example, and concise setup instructions.

Include a short admin guide and a mapping of public website areas to their corresponding admin screens.

Finish with a concise report of what was implemented, what was verified, and any genuine remaining limitations. Continue through implementation and verification; do not stop after producing a plan.
