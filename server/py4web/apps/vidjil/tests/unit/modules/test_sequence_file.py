# TODO : extracted from file tests, to convert to py4web
        

    # def testUpdateNameOfSequenceFile(self):
    #     sequence_id = self.createDumbSequenceFile()
    #     data_file = db.sequence_file[sequence_id].data_file

    #     update_name_of_sequence_file(sequence_id, 'toto.txt', 'LICENSE')

    #     current_sequence = db.sequence_file[sequence_id]
    #     self.assertEquals(current_sequence.size_file, os.path.getsize('LICENSE'))
    #     self.assertEquals(current_sequence.data_file, 'LICENSE')
    #     self.assertEquals(current_sequence.filename, 'toto.txt')

    # def testGetNewUploaddedFilename(self):
    #     sequence_id = self.createDumbSequenceFile()
    #     data_file = db.sequence_file[sequence_id].data_file

    #     filename = get_new_uploaded_filename(data_file, "truc.def")

    #     self.assertEquals(filename[-4:], ".def")
    #     self.assertTrue(filename.find(base64.b16encode('truc.def').lower() + ".def") > -1)