---
layout: default
title: Home
---

# Leo Levintza

<p class="lead">Principal Software Engineer · Distributed Systems · Cloud-Native Backends · Agentic AI Tooling &amp; AI-Augmented SDLC · New York Metro Area</p>

I design and build distributed, cloud-native backend systems, most recently for buy-side firms: a quantitative hedge fund, a global alternative asset manager, and a large US asset manager. Lately I embed agentic AI tooling (Claude Code, GitHub Copilot CLI, Sourcegraph Cody) into the SDLC: legacy discovery, documentation, code-review agents, and evaluation frameworks for AI-assisted delivery.

{% include contacts.html %}

## Featured projects

{% include featured.html %}

[All projects and public repos →]({{ "/projects/" | relative_url }})

## Latest posts

{% if site.posts.size > 0 %}
<ul>
{% for post in site.posts limit:5 %}
  <li><a href="{{ post.url | relative_url }}">{{ post.title }}</a> <span class="post-meta">{{ post.date | date: "%b %-d, %Y" }}</span></li>
{% endfor %}
</ul>
[All posts →]({{ "/blog/" | relative_url }})
{% else %}
No posts yet.
{% endif %}
