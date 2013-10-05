#!/usr/local/bin/python
import feedparser

def GetParsedFeed(url):
	return feedparser.parse(url);

def GetEntriesList(feedParserObject):
	return feedParserObject.entries;

#Given a list, return the items matching
#at least 1 one of keywords given
def findKeywordsInList(keywordList, rssItemList):
	matchList = [];
	for rssItem in rssItemList:
		for keyword in keywordList:	
			#ignore case
			if keyword.lower() in rssItem['title'].lower():
				print '{0}'.format(rssItem['title'].lower());
				matchList.append(keyword);	
	return matchList;
	
def makeCraigsListUrl(cityString, sectionString):
	return "http://" + cityString + ".en.craigslist.ca/" + sectionString + "/index.rss";

def main():	
	keyword = ['Lg'];
	parser = GetParsedFeed(makeCraigsListUrl("vancouver", "ela"));
	entryList = GetEntriesList(parser);
	for each in entryList:
		print u'{0}'.format(each['title']);

	findKeywordsInList(keyword, entryList);
	

#calls the main function muddfucak
main();
