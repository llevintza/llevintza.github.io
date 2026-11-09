---
layout: page
title: Blog
permalink: /blog/
---

{% if site.posts.size > 0 %}
<ul class="post-list">
{% for post in site.posts %}
  <li>
    <span class="post-meta">{{ post.date | date: "%b %-d, %Y" }}</span>
    <h3><a class="post-link" href="{{ post.url | relative_url }}">{{ post.title | escape }}</a></h3>
    {% if site.show_excerpts %}{{ post.excerpt }}{% endif %}
  </li>
{% endfor %}
</ul>
<p class="rss-subscribe">Subscribe <a href="{{ "/feed.xml" | relative_url }}">via RSS</a></p>
{% else %}
No posts yet. Subscribe <a href="{{ "/feed.xml" | relative_url }}">via RSS</a> to hear about the first one.
{% endif %}
