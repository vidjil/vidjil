class Uploader {
  constructor(database) {
    var self = this;
    this.fileIdMatch = {};
    this.queue = {};
    this.db = database;

    // Initialize Resumable.js
    this.resumable = new Resumable({
      target: this.db.db_address + "file/resumable_upload",
      // deactivate this feature for now until who know what we're doing :)
      testChunks: false,
      throttleProgressCallbacks: 1,
      withCredentials: true,
      generateUniqueIdentifier: function (file) {
        return self.generateUniqueIdentifier(file);
      },
    });

    this.resumable.on("fileAdded", function (resumableFile) {
      self.queue[resumableFile.uniqueIdentifier].status = "upload";
      self.display_summary();
      self.resumable.upload();
    });

    this.resumable.on("fileProgress", function (resumableFile) {
      self.queue[resumableFile.uniqueIdentifier].percent = Math.floor(
        resumableFile.progress() * 100
      );
    });

    this.resumable.on("fileSuccess", function (resumableFile) {
      self.db.info("Upload completed for " + resumableFile.fileName);
      self.queue[resumableFile.uniqueIdentifier].status = "server_check";
      self.display_summary();

      // Call upload
      const url =
        self.db.db_address +
        "file/upload?" +
        self.db.argsToStr({
          sequence_id: resumableFile.uniqueIdentifier,
          filename: resumableFile.fileName,
          file_number: self.queue[resumableFile.uniqueIdentifier].file_number,
          pre_process: self.queue[resumableFile.uniqueIdentifier].pre_process,
        });

      $.ajax({
        type: "POST",
        timeout: self.db.DB_TIMEOUT_CALL,
        crossDomain: true,
        url: url,
        xhrFields: { withCredentials: true },
        success: function (result) {
          db.info("Upload validated for " + resumableFile.fileName);
          self.queue[resumableFile.uniqueIdentifier].status = "completed";
          self.reload(resumableFile.uniqueIdentifier);
          db.display_result(result, url);
        },
        error: function (request, status, error) {
          if (status === "timeout") {
            db.warn("Upload timed out for " + resumableFile.filename);
            self.queue[resumableFile.uniqueIdentifier].status = "upload_error";
            console.log({
              type: "flash",
              default: "database_timeout",
              priority: 2,
            });
          } else {
            if (status !== "abort") {
              db.warn(
                "Upload may have failed for " +
                  resumableFile.fileName +
                  ": " +
                  status +
                  " - " +
                  error
              );
              self.queue[resumableFile.uniqueIdentifier].status =
                "upload_error";
              console.log({
                type: "flash",
                msg: "Upload " + resumableFile.fileName + " : " + status,
                priority: 2,
              });
            }
          }
          self.display();
        },
      });
    });

    this.resumable.on("fileError", function (resumableFile, message) {
      self.db.warn(
        "Upload may have failed for " + resumableFile.fileName + ": " + message
      );
      self.queue[resumableFile.uniqueIdentifier].status = "upload_error";
      self.display_summary();
    });

    setInterval(function () {
      if (self.is_uploading()) {
        self.update_percent();
      }
    }, 200);
  }

  add(id, data) {
    var file = data.get("file");
    var pre_process = data.get("pre_process");
    var file_number = data.get("file_number");
    var div_parent = $("#upload_summary_selector").children()[0];
    var div = $("<div/>").appendTo(div_parent);
    this.queue[id] = {
      filename: file.name,
      file: file,
      status: "queued",
      percent: 0,
      div: div,
      pre_process: pre_process,
      file_number: file_number,
    };
    this.fileIdMatch[file] = id;
    this.resumable.addFile(file);
  }

  generateUniqueIdentifier(file) {
    if (file in this.fileIdMatch) {
      return this.fileIdMatch[file];
    } else {
      return this.resumable.generateUniqueIdentifier(file);
    }
  }

  cancel(id) {
    var file = this.resumable.getFromUniqueIdentifier(id);
    if (file) {
      file.cancel();
      this.db.warn("Upload canceled - " + file.fileName);
      this.queue[id].status = "canceled";
      this.display();
    }
  }

  retry(id) {
    var file = this.resumable.getFromUniqueIdentifier(id);
    if (file) {
      // We found the file in resumable
      file.retry();
      this.queue[id].status = "queued";
      this.display();
    } else {
      // We need to add the file to resumable
      if (id in this.queue) {
        var file = this.queue[id].file;
        this.queue[id].status = "queued";
        this.fileIdMatch[file] = id;
        this.resumable.addFile(file);
        this.display();
      }
    }
  }

  reload(id) {
    if (document.getElementById("sequence_file_" + id)) {
      this.db.reload();
    }
    this.display_summary();
  }

  update_percent() {
    for (var key in this.queue) {
      if (this.queue[key].status == "upload") {
        $(".loading_" + key).width(this.queue[key].percent + "%");
      }
    }
  }

  display() {
    for (var key in this.queue) {
      var status = this.queue[key].status;
      if (status != "completed") {
        var html = this.statusHtml(key);
        $("#sequence_file_" + key).html(html);
      }
    }
    this.display_summary();
  }

  display_summary() {
    if (this.is_uploading()) {
      $("#upload_summary").css("display", "block");
      $("#upload_summary_label").html(
        "<span class='loading_seq'>uploading</span>"
      );
    } else {
      $("#upload_summary_label").html(
        "<span class='loading_status'>uploads</span>"
      );
    }

    for (var key in this.queue) {
      var queue_element = this.queue[key];
      var html =
        "<span class='summary_filename' title='" +
        queue_element.filename +
        "'>" +
        queue_element.filename +
        "</span>";
      html += this.statusHtml(key);
      if (queue_element.status == "completed") {
        html += "<span class='loading_status'> completed </span>";
      }
      if (queue_element.div) {
        queue_element.div.html(html);
      } else {
        console.warn("queue_element.div is undefined for key:", key); // Log the issue
      }
    }
  }

  statusHtml(id) {
    var status = this.queue[id].status;
    var html = "";

    switch (status) {
      case "queued":
        html += "<span class='loading_seq'>queued</span>";
        html +=
          "<span class='button2' onclick='db.uploader.cancel(\"" +
          id +
          "\")'>cancel</span>";
        break;
      case "upload":
        html +=
          "<span class='loading_gauge'><span class='loading_" +
          id +
          " loading_bar'></span></span>";
        html +=
          "<span class='button2' onclick='db.uploader.cancel(\"" +
          id +
          "\")'>cancel</span>";
        break;
      case "server_check":
        html += "<span class='loading_seq'> processing file </span>";
        break;
      case "canceled":
        html += "<span class='loading_status'> canceled by user </span>";
        html +=
          "<span class='button2' onclick='db.uploader.retry(\"" +
          id +
          "\")'>try again</span>";
        break;
      case "upload_error":
        html += "<span class='loading_status'> upload failed </span>";
        html +=
          "<span class='button2' onclick='db.uploader.retry(\"" +
          id +
          "\")'>try again</span>";
        break;
    }

    return html;
  }

  is_uploading() {
    return this.resumable.files.some((file) => file.isUploading());
  }
}
