# This file is part of HEPData.
# Copyright (C) 2016 CERN.
#
# HEPData is free software; you can redistribute it
# and/or modify it under the terms of the GNU General Public License as
# published by the Free Software Foundation; either version 2 of the
# License, or (at your option) any later version.
#
# HEPData is distributed in the hope that it will be
# useful, but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
# General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with HEPData; if not, write to the
# Free Software Foundation, Inc., 59 Temple Place, Suite 330, Boston,
# MA 02111-1307, USA.
#
# In applying this license, CERN does not
# waive the privileges and immunities granted to it by virtue of its status
# as an Intergovernmental Organization or submit itself to any jurisdiction.

import re
from opensearch_dsl import Q

from hepdata.config import CFG_SEARCH_RANGE_TERMS


class QueryBuilder:

    @staticmethod
    def add_filters(search, filters):
        from .config.os_config import get_filter_field

        for name, value in filters:
            if name == "author":
                search = search.query('nested', path='authors', query=Q('match', authors__full_name = value))
            else:
                (filter_type, field, value) = get_filter_field(name, value)
                search = search.filter(filter_type, **{field: value})

        return search


class HEPDataQueryParser(object):
    @staticmethod
    def parse_query(query_string):
        # query should be something like 'observable:ASYM' which
        # would translate to data_keywords.observables:ASYM
        mapping = {
            "keys": {
                "observables": "data_keywords.observables",
                "cmenergies": "data_keywords.cmenergies",
                "phrases": "data_keywords.phrases",
                "reactions": "data_keywords.reactions",
                "analysis": "analyses.type",
                "resources": "resources.description",  # Add shorthand for resource description
                "publication_recid": "recid"
            }
        }

        new_query_string = query_string

        for query_part in re.split("AND|OR", query_string):
            query_part = query_part.strip()
            if ':' in query_part:
                _key, _value = query_part.split(':', maxsplit=1)
                _key = mapping['keys'].get(_key, _key)
                _value = HEPDataQueryParser._quote_phrase(_value)
                new_query_string = new_query_string.replace(query_part, f"{_key}:{_value}")
            else:
                new_query_string = new_query_string.replace(
                    query_part, HEPDataQueryParser()._quote_phrase(query_part)
                )

        return new_query_string

    @staticmethod
    def _quote_phrase(phrase):
        # Match phrases containing a reaction (including "-->") or a doi (word
        # chars with / in the middle) and quote them
        pattern = re.compile("(.*-->.*|[\w\.]+\/[\w\.]+)")

        if '"' not in phrase and pattern.fullmatch(phrase):
            return f'"{phrase}"'
        return phrase

    @staticmethod
    def is_range_query(query):
        """
        Simple function to do a regex match against the expected range query
        pattern.

        :param query: The query string to check.
        :return: True if the query string matches the expected range query.
        """
        try:
            result = any(
                [re.match(rf"{pt}:\[\d+ TO \d+]", query) for pt in CFG_SEARCH_RANGE_TERMS]
            )
            return bool(result)
        except TypeError:
            # We just return False if there is a TypeError.
            return False

    @staticmethod
    def parse_range_query(query_string):
        """
        Parses a given range query string in an expected format
          found in HEPDataQueryParser.is_range_query
          to determine the integers used for the ranges.
        Also returns the base term like "publication_recid"

        :param query_string: The range query string.
        :return: A tuple of the upper and lower range bounds from the query string,
            as well as the split off "term" value, or None for both.
        """

        # Contains shorthand variables/mapping for term conversion to
        #   OpenSearch usable term
        term_mapping = {
            "publication_recid": "recid",
        }

        try:
            # Split string and determine where ranges are
            ranges = query_string.split("[")[1].split("]")[0]
            # Check type and return
            range_split = ranges.split(" TO ")
            lower_range, upper_range = int(range_split[0]), int(range_split[1])

            # Get corresponding term from the mapping
            term = term_mapping[query_string.split(":[")[0]]

            return (lower_range, upper_range), term
        except (ValueError, IndexError):
            # If there's something wrong with the string, return None
            return None, None

