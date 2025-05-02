import email
from typing import List

from .. import settings
from ..common import log, mail


def send_mail(to: str | List[str], subject: str, body: str):
    try:
        mail.send(
            to=to,
            subject=subject,
            body=body,
            headers={"Message-ID": email.utils.make_msgid(domain=settings.SMTP_DOMAIN)},
        )
    except Exception as exception:
        log.error(f"Error when sending mail: {exception=}")
