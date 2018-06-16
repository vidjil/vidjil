#!/usr/bin/python

import unittest

class TagModel (unittest.TestCase):
        
    def __init__(self, p):
        global auth, session, request
        unittest.TestCase.__init__(self, p)
        
    def setUp(self):
        # Load the to-be-tested file
        execfile("applications/vidjil/models/tag.py", globals())

    def test_register_tags(self):
        text = "this text contains a #tag"
        table_name = 'patient'
        register_tags(db, table_name, fake_patient_id, text, fake_group_id)

        tag = db(db.tag.name == 'tag').select().first()
        refs = db((db.tag_ref.table_name == table_name) &
                 (db.tag_ref.record_id == fake_patient_id) &
                 (db.tag_ref.tag_id == tag.id)
                ).select()
        self.assertTrue(len(refs) == 1, 'incorrect number of tags match this description')

    def test_tags_to_json(self):
        group_ids = [unique_group, fake_group_id]
        tags = get_tags(db, group_ids)
        json_tags = tags_to_json(tags, group_ids)

        tag_dict = json.loads(json_tags)
        self.assertTrue(tag_dict.has_key(str(unique_group)), "tag_dict missing key unique_group: %d" % unique_group)
        self.assertTrue(tag_dict.has_key(str(fake_group_id)), "tag_dict missing key unique_group: %d" % unique_group)

        self.assertTrue(len(tag_dict[str(unique_group)]) > 0, "missing tags for unique_group: %d" % unique_group)

    def test_parse_search(self):
        prefix = get_tag_prefix()
        search_string = "%stags and a search %sswag" % (prefix, prefix)
        search, tags = parse_search(search_string)

        self.assertEqual(search, "and a search", "incorrect search terms extracted")
        self.assertTrue("tags" in tags, "the tag 'tags' was not detected")
        self.assertTrue("swag" in tags, "the tag 'swag' was not detected")
