class Uploader {
  constructor(database) {
    var self = this;
    this.queue = {};
    this.db = database;

    // Initialize Resumable.js
    this.resumable = new Resumable({
      target: this.db.db_address + "file/resumable_upload",
      chunkSize: 1 * 1024 * 1024, // 1MB
      simultaneousUploads: 2,
      testChunks: true,
      throttleProgressCallbacks: 1,
      withCredentials: true,
    });

    this.resumable.on("fileAdded", function (file) {
      var div_parent = $("#upload_summary_selector").children()[0];
      var div = $('<div/>').appendTo(div_parent);
      self.queue[file.uniqueIdentifier] = {
        filename: file.fileName,
        status: "queued",
        percent: 0,
        div: div,
      };
      self.display_summary();
      self.resumable.upload();
    });

    this.resumable.on("fileProgress", function (file) {
      self.queue[file.uniqueIdentifier].percent = Math.floor(
        file.progress() * 100
      );
      self.display();
    });

    this.resumable.on("fileSuccess", function (file, message) {
      self.db.info("Upload completed for " + file.fileName);
      self.queue[file.uniqueIdentifier].status = "completed";
      self.display_summary();
      self.db.display_result(message, self.db.db_address + "file/upload");
    });

    this.resumable.on("fileError", function (file, message) {
      self.db.warn(
        "Upload may have failed for " + file.fileName + ": " + message
      );
      self.queue[file.uniqueIdentifier].status = "upload_error";
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
    this.resumable.addFile(file);
  }

  cancel(id) {
    var file = this.resumable.getFromUniqueIdentifier(id);
    if (file) {
      file.cancel();
      this.db.warn("Upload canceled - " + file.fileName);
      this.queue[id].status = "canceled";
      this.display_summary();
    }
  }

  retry(id) {
    var file = this.resumable.getFromUniqueIdentifier(id);
    if (file) {
      file.retry();
      this.queue[id].status = "queued";
      this.display_summary();
    }
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
        "<span class='summary_filename'>" + queue_element.filename + "</span>";
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
