import defs
import re

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
            
    def link_to_record(self, tag_name, table, record_id):
        db = self.db
        tag_entry = db(db.tag.name == tag_name).select(db.tag.id).first()
        if (tag_entry is None):
            tag_entry = self.create(tag_name)
        db.tag_ref.insert(tag_id=tag_entry,
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

    def execute(self, table, record_id, text, reset=False):
        if (reset):
            self.remove_tags(table, record_id)
        tags = self.parse_text(text)
        for tag in tags:
            self.link_to_record(tag, table, record_id)
        return tags

class TagDecorator(TagManager):

    def __init__(self, prefix):
        super(TagDecorator, self).__init__(prefix)

    def decoration(self, ltype, stype, target):
        this = "$(this)" # hack to solve some character escaping issues
        return r'<a onclick="event.preventDefault();event.stopPropagation();db.callLinkable(%s)" href="%s" class="%s-link" data-sample-type="%s" data-linkable-type="%s" data-linkable-name="\1">%s\1</a>' % (this, target, ltype, stype, ltype, self.prefix)

    def decorate_text(self, text, ltype, stype, target):
        if (text is None):
            return None
        return re.sub(self.expression(), self.decoration(ltype, stype, target), text)

def get_tag_prefix():
    try:
        tag_prefix = defs.TAG_PREFIX
    except:
        tag_prefix = '#'
    return tag_prefix

def register_tags(db, table, record_id, text, reset=False):
    tag_prefix = get_tag_prefix()
    tag_extractor = TagExtractor(tag_prefix, db)
    tags = tag_extractor.execute(table, record_id, text, reset)
    #log.debug("registered tags %s to %s (%d)" % (str(tags), table, record_id))
