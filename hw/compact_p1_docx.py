from docx import Document

PATH = 'hw/P1.docx'


def remove_paragraph(paragraph):
    element = paragraph._element
    element.getparent().remove(element)
    paragraph._p = paragraph._element = None


def is_rule(paragraph):
    text = paragraph.text.strip()
    return len(text) >= 20 and set(text) == {'_'}


def compact_rules_after(doc, marker, keep):
    paragraphs = list(doc.paragraphs)
    start = next((i for i, p in enumerate(paragraphs) if p.text.strip().startswith(marker)), None)
    if start is None:
        raise SystemExit(f'P1 compact layout failed: marker not found: {marker!r}')

    rules = []
    for paragraph in paragraphs[start + 1:]:
        text = paragraph.text.strip()
        if is_rule(paragraph):
            rules.append(paragraph)
            continue
        if rules:
            break
        # Allow short labels/instructions between the marker and the answer area.
        if text.startswith(('Entscheidung:', 'Begründe deine Entscheidung.')) or not text:
            continue
        # Stop at the next numbered task/heading before accidentally touching a later area.
        if paragraph.style and paragraph.style.name.startswith('Heading'):
            break

    if len(rules) < keep:
        raise SystemExit(
            f'P1 compact layout failed: {marker!r} expected at least {keep} answer rules, found {len(rules)}'
        )

    for paragraph in rules[keep:]:
        remove_paragraph(paragraph)


doc = Document(PATH)

# Digital-first answer space: blank fields expand naturally while typing, so
# repeated paper-style rule lines only waste pages. Keep enough initial room
# for orientation without forcing students to delete placeholder characters.
compact_rules_after(doc, 'Welchen Laptop würdest du empfehlen?', 2)
compact_rules_after(doc, 'Begründe deine Entscheidung. (2 P)', 2)
compact_rules_after(doc, '2. Warum ist die Herstellung von Elektronik ökologisch relevant?', 1)
compact_rules_after(doc, 'Was würdest du zuerst ändern – und warum?', 1)
compact_rules_after(doc, 'Welche Komponente ist der wahrscheinlichste Flaschenhals?', 1)

doc.save(PATH)
print(PATH)
