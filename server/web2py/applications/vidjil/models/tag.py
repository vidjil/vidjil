import defs
import re
import json

class TagManager(object):

    def __init__(self, prefix):
        self.prefix = prefix

    def expression(self):
        return r'%s(\w+)' % self.prefix

class TagExtractor(TagManager):

    def __init__(self, prefix, db):
        super(TagExtractor, self).__init__(prefix)
        self.db = db

    def create(self, name):
        db = self.db
        try:
            tid = db.tag.insert(name=name)
            db.commit()
        except:
            tid = db(db.tag.name == name).select(db.tag.id).first()
        return tid

    def link_to_group(self, tag_id, group_id):
        db = self.db
        assocs = db((db.group_tag.tag_id == tag_id) &
                    (db.group_tag.group_id == group_id)
                ).select()
        if len(assocs) == 0:
            db.group_tag.insert(group_id=group_id, tag_id=tag_id)
            db.commit()

    def link_to_record(self, tag_id, table, record_id):
        db = self.db
        db.tag_ref.insert(tag_id=tag_id,
                          table_name=table,
                          record_id=record_id)
        db.commit()

    def remove_tags(self, table, record_id):
        db = self.db
        db((db.tag_ref.table_name == table) &
           (db.tag_ref.record_id == record_id)
          ).delete()
        db.commit()

    def parse_text(self, text):
        return re.findall(self.expression(), text)

    def execute(self, table, record_id, text, group_id, reset=False):
        if (reset):
            self.remove_tags(table, record_id)
        tags = self.parse_text(text)
        for tag in tags:
            tag_id = self.create(tag)
            self.link_to_group(tag_id, group_id)
            self.link_to_record(tag_id, table, record_id)
        return tags

class TagDecorator(TagManager):

    def __init__(self, prefix):
        super(TagDecorator, self).__init__(prefix)

    def decoration(self, ltype, stype, target):
        this = "$(this)" # hack to solve some character escaping issues
        return r'<a onclick="event.preventDefault();event.stopPropagation();db.callLinkable(%s)" href="%s" class="%s-link" data-sample-type="%s" data-linkable-type="%s" data-linkable-name="\1">%s\1</a>' % (this, target, ltype, stype, ltype, self.prefix)

    def decorate(self, text, ltype, stype, target):
        if (text is None):
            return None
        return re.sub(self.expression(), self.decoration(ltype, stype, target), text)

def get_tag_prefix():
    try:
        tag_prefix = defs.TAG_PREFIX
    except:
        tag_prefix = '#'
    return tag_prefix

def register_tags(db, table, record_id, text, group_id, reset=False):
    tag_prefix = get_tag_prefix()
    tag_extractor = TagExtractor(tag_prefix, db)
    tags = tag_extractor.execute(table, record_id, text, group_id, reset)

def get_tags(db, group_id):
    return db((db.tag.id == db.group_tag.tag_id) &
              (db.group_tag.group_id == group_id)
            ).select(db.tag.ALL)

def tags_to_json(tags):
    tag_list = []
    prefix = get_tag_prefix()
    for tag in tags:
        tag_dict = {}
        tag_dict['id'] = tag.id
        tag_dict['name'] = tag.name
        tag_list.append(tag_dict)

    return json.dumps(tag_list)
