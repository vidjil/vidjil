import defs
import re
import json

class TagManager(object):

    def __init__(self, prefix):
        self.prefix = prefix

    def expression(self):
        return ur'%s([\w-]+)' % self.prefix

class TagExtractor(TagManager):

    def __init__(self, prefix, db):
        super(TagExtractor, self).__init__(prefix)
        self.db = db

    def create(self, name):
        db = self.db
        tid = db(db.tag.name.upper() == name.upper()).select(db.tag.id).first()
        if (tid is None):
            tid = db.tag.insert(name=name)
            db.commit()
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
        return list(set(re.findall(self.expression(), text, re.UNICODE)))

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
        return ur'<a onclick="event.preventDefault();event.stopPropagation();db.callLinkable(%s)" href="%s" class="%s-link" data-sample-type="%s" data-linkable-type="%s" data-linkable-target-param="%s" data-linkable-name="%s\1">%s\1</a>' % (this, target, ltype, stype, ltype, "filter", self.prefix, self.prefix)

    def decorate(self, text, ltype, stype, target):
        if (text is None):
            return None
        return re.sub(self.expression(), self.decoration(ltype, stype, target), unicode(text, 'utf-8'), flags=re.UNICODE)

    def sanitize(self, text):
        return XML(text,
                sanitize=False,
                permitted_tags=['a'],
                allowed_attributes={'a':['class', 'href', 'onclick', 'data-sample-type', 'data-linkable-type', 'data-linkable-target-param', 'data-linkable-name']})

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

def get_tags(db, group_ids):
    pgid = get_public_group_id(group_ids)
    if pgid > 0:
        group_ids.append(pgid)

    return db((db.tag.id == db.group_tag.tag_id) &
              (db.group_tag.group_id.belongs(group_ids))
            ).select(db.group_tag.group_id, db.tag.ALL)

def tags_to_json(tags, group_ids):
    tag_map = {}
    prefix = get_tag_prefix()
    for row in tags:
        group_id = row.group_tag.group_id
        if group_id not in tag_map:
            tag_map[group_id] = []
        tag_dict = {}
        tag_dict['id'] = row.tag.id
        tag_dict['name'] = row.tag.name
        tag_map[group_id].append(tag_dict)

    # Public group hackiness. Mainly to clean up some other hackier hackiness
    pgid = get_public_group_id(group_ids)
    if pgid > 0 and pgid in tag_map:
        for group_id in tag_map:
            for tag in tag_map[pgid]:
                if tag not in tag_map[group_id]:
                    tag_map[group_id].append(tag)

    return json.dumps(tag_map)

def parse_search(search_string):
    split = search_string.split()
    tag_prefix = get_tag_prefix()
    plen = len(tag_prefix)
    tags = [t[plen:] for t in split if t[:plen] == tag_prefix]
    searches = [s for s in split if s[:plen] != tag_prefix]
    search_string = " ".join(searches)
    return search_string, tags

def get_public_group_id(group_ids):
    public_group_name = defs.PUBLIC_GROUP_NAME if hasattr(defs, 'PUBLIC_GROUP_NAME') else 'public'
    public_group = db(db.auth_group.role == public_group_name).select()
    if (len(public_group) > 0 and public_group[0].id not in group_ids):
        return public_group[0].id
    return -1

def get_sample_set_tags(sample_id):
    sample_set = db.sample_set[sample_id]
    sample_type = sample_set.sample_type
    table = db(db[sample_type].sample_set_id == sample_id).select()
    for row in table:
        tag_ref = db((row.id == db.tag_ref.record_id)
                & (db.tag_ref.table_name == sample_type)
                & (db.tag_ref.tag_id == db.tag.id)).select(db.tag.name)
    return tag_ref
