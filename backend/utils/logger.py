#  SPDX-License-Identifier: GPL-3.0-or-later
#  Copyright (c) 2026. Ryan Huston
import logging
import sys

from config.config import settings


def setup_logger():
    """
    Configures and returns the global logger.
    """
    logging.basicConfig(
        level=logging.DEBUG if settings.debug else logging.INFO,
        format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
        handlers=[logging.StreamHandler(sys.stdout)]
    )

    return logging.getLogger("nextwatch")

logger = setup_logger()