---
name: web-design-guidelines
description: Review UI code for compliance with web interface best practices. Audits your code for 100+ rules covering accessibility, performance, and UX.
use_when:
  - "Review my UI"
  - "Check accessibility"
  - "Audit design"
  - "Review UX"
  - "Check my site against best practices"
  - "Review my portfolio"
  - "Check dark mode implementation"
  - "Audit animations"
  - "Review responsive design"
categories:
  - Accessibility
  - Focus States
  - Forms
  - Animation
  - Typography
  - Images
  - Performance
  - Navigation & State
  - Dark Mode & Theming
  - Touch & Interaction
  - Locale & i18n
---

# Web Design Guidelines

Review the code for compliance with web interface best practices. Focus on these key areas for the Astro portfolio project:

## Accessibility (Critical)
- Check for proper semantic HTML5 elements
- Verify ARIA labels and roles
- Ensure keyboard navigation works
- Check color contrast ratios
- Validate screen reader compatibility

## Focus States (High)
- Ensure visible focus indicators
- Implement focus-visible patterns
- Check focus management in modals/drawers
- Verify focus trap behavior

## Animation (High for this project)
- Respect prefers-reduced-motion
- Use compositor-friendly transforms (transform, opacity)
- Avoid layout thrashing animations
- Check scroll animations performance
- Verify smooth transitions

## Dark Mode & Theming (Critical for this project)
- Implement proper color-scheme meta tags
- Check theme-color meta tag
- Ensure smooth theme transitions
- Verify system preference detection
- Check color contrast in both themes

## Typography (Medium)
- Use proper curly quotes
- Implement ellipsis for overflow text
- Use tabular-nums for numbers
- Check font loading performance
- Verify responsive typography

## Performance (High)
- Implement virtualization for large lists
- Avoid layout thrashing
- Use preconnect for external resources
- Optimize image loading
- Check Core Web Vitals

## Navigation & State (Medium)
- Ensure URL reflects application state
- Implement proper deep-linking
- Check browser back/forward functionality
- Verify scroll position restoration

## Images (Medium)
- Include proper dimensions
- Implement lazy loading
- Add descriptive alt text
- Optimize image formats
- Check responsive images

## Touch & Interaction (Medium)
- Implement proper touch-action
- Remove tap highlights on interactive elements
- Check touch target sizes
- Verify gesture support

## Forms (Low - mainly for contact section)
- Implement proper autocomplete attributes
- Add validation and error handling
- Check form submission behavior
- Ensure proper labeling

## Specific to Astro Portfolio
- Verify bento grid accessibility
- Check scroll animations respect reduced motion
- Ensure smooth page transitions
- Validate responsive design across devices
- Check image gallery accessibility
- Verify journal section semantic structure

## Review Process
1. Scan the codebase systematically
2. Check each category above
3. Provide specific recommendations
4. Prioritize issues by severity (Critical/High/Medium/Low)
5. Suggest implementation approaches
6. Verify fixes don't break existing functionality
