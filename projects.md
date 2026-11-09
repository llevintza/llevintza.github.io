---
layout: page
title: Projects
permalink: /projects/
---

## Featured

{% include featured.html %}

Private repos: email me your GitHub username for read-only access.

## All public repos

Every public repo on [github.com/llevintza](https://github.com/llevintza), most recently updated first. This list is regenerated each time the site is rebuilt.

{% assign repos = site.github.public_repositories | sort: "pushed_at" | reverse %}
<table class="repos">
  <thead><tr><th>Repo</th><th>What</th><th>Language</th><th>Updated</th></tr></thead>
  <tbody>
  {%- for r in repos -%}
    {%- if r.fork or r.archived -%}{%- continue -%}{%- endif -%}
    {%- if site.repo_exclude contains r.name -%}{%- continue -%}{%- endif -%}
    <tr>
      <td><a href="{{ r.html_url }}">{{ r.name }}</a>{% if r.has_pages %}<br><a href="https://llevintza.github.io/{{ r.name }}/" class="muted">live site</a>{% endif %}</td>
      <td>{{ r.description | default: "" | escape }}</td>
      <td class="muted">{{ r.language }}</td>
      <td class="muted">{{ r.pushed_at | date: "%Y-%m" }}</td>
    </tr>
  {%- endfor -%}
  </tbody>
</table>
